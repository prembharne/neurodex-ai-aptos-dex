// useGovernance.js - Governance contract interaction hooks
import { useState, useCallback, useEffect } from 'react';
import useWallet from './useWallet';
import { buildFunctionName } from '../config/contractConfig';

export const useGovernance = () => {
  const { aptos, signAndSubmitTransaction, connected, address } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [userVotingPower, setUserVotingPower] = useState(0);

  // Create a new governance proposal
  const createProposal = useCallback(async ({
    title,
    description,
    proposalType, // 'parameter_change', 'upgrade', 'general'
    executionData = null, // For executable proposals
    votingPeriod = 604800 // 1 week in seconds
  }) => {
    if (!connected) throw new Error('Wallet not connected');
    
    setLoading(true);
    setError(null);

    try {
      // Convert strings to bytes if needed (depends on your contract implementation)
      const titleBytes = new TextEncoder().encode(title);
      const descriptionBytes = new TextEncoder().encode(description);
      
      const transaction = {
        type: "entry_function_payload",
        function: buildFunctionName('GOVERNANCE', 'createProposal'),
        type_arguments: [],
        arguments: [
          Array.from(titleBytes),
          Array.from(descriptionBytes),
          proposalType === 'parameter_change' ? '0' : 
          proposalType === 'upgrade' ? '1' : '2', // proposal type enum
          executionData ? Array.from(new TextEncoder().encode(executionData)) : [],
          votingPeriod.toString()
        ]
      };

      const response = await signAndSubmitTransaction(transaction);
      
      await aptos.waitForTransaction({
        transactionHash: response.hash,
        options: { timeoutSecs: 30, checkSuccess: true }
      });

      // Refresh proposals
      await fetchProposals();
      
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [connected, signAndSubmitTransaction, aptos]);

  // Vote on a proposal
  const vote = useCallback(async (proposalId, voteChoice, votingPower = null) => {
    if (!connected) throw new Error('Wallet not connected');
    
    setLoading(true);
    setError(null);

    try {
      // voteChoice: 'for', 'against', 'abstain'
      const voteValue = voteChoice === 'for' ? '1' : voteChoice === 'against' ? '0' : '2';
      
      // Use specified voting power or user's max power
      const powerToUse = votingPower ? votingPower.toString() : userVotingPower.toString();

      const transaction = {
        type: "entry_function_payload",
        function: buildFunctionName('GOVERNANCE', 'vote'),
        type_arguments: [],
        arguments: [
          proposalId.toString(),
          voteValue,
          powerToUse
        ]
      };

      const response = await signAndSubmitTransaction(transaction);
      
      await aptos.waitForTransaction({
        transactionHash: response.hash,
        options: { timeoutSecs: 30, checkSuccess: true }
      });

      // Refresh proposals and voting power
      await Promise.all([fetchProposals(), fetchUserVotingPower()]);
      
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [connected, signAndSubmitTransaction, aptos, userVotingPower]);

  // Execute a passed proposal (usually only callable by governance contract or admin)
  const executeProposal = useCallback(async (proposalId) => {
    if (!connected) throw new Error('Wallet not connected');
    
    setLoading(true);
    setError(null);

    try {
      const transaction = {
        type: "entry_function_payload",
        function: buildFunctionName('GOVERNANCE', 'executeProposal'),
        type_arguments: [],
        arguments: [proposalId.toString()]
      };

      const response = await signAndSubmitTransaction(transaction);
      
      await aptos.waitForTransaction({
        transactionHash: response.hash,
        options: { timeoutSecs: 30, checkSuccess: true }
      });

      await fetchProposals();
      
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [connected, signAndSubmitTransaction, aptos]);

  // Fetch all proposals
  const fetchProposals = useCallback(async (limit = 50, offset = 0) => {
    try {
      const response = await aptos.view({
        payload: {
          function: buildFunctionName('GOVERNANCE', 'getProposals'),
          type_arguments: [],
          arguments: [limit.toString(), offset.toString()]
        }
      });

      const proposals = response[0].map(proposal => ({
        id: proposal.id,
        title: new TextDecoder().decode(new Uint8Array(proposal.title)),
        description: new TextDecoder().decode(new Uint8Array(proposal.description)),
        proposer: proposal.proposer,
        proposalType: proposal.proposal_type === '0' ? 'parameter_change' : 
                     proposal.proposal_type === '1' ? 'upgrade' : 'general',
        state: proposal.state, // 'pending', 'active', 'succeeded', 'defeated', 'executed'
        votesFor: parseFloat(proposal.votes_for) / Math.pow(10, 8),
        votesAgainst: parseFloat(proposal.votes_against) / Math.pow(10, 8),
        votesAbstain: parseFloat(proposal.votes_abstain) / Math.pow(10, 8),
        totalVotes: parseFloat(proposal.total_votes) / Math.pow(10, 8),
        quorumThreshold: parseFloat(proposal.quorum_threshold) / Math.pow(10, 8),
        startTime: parseInt(proposal.start_time),
        endTime: parseInt(proposal.end_time),
        executionTime: parseInt(proposal.execution_time),
        createdAt: parseInt(proposal.created_at)
      }));

      setProposals(proposals);
      return proposals;
    } catch (err) {
      console.error('Failed to fetch proposals:', err);
      setProposals([]);
      return [];
    }
  }, [aptos]);

  // Fetch a specific proposal
  const fetchProposal = useCallback(async (proposalId) => {
    try {
      const response = await aptos.view({
        payload: {
          function: buildFunctionName('GOVERNANCE', 'getProposal'),
          type_arguments: [],
          arguments: [proposalId.toString()]
        }
      });

      const proposal = response[0];
      return {
        id: proposal.id,
        title: new TextDecoder().decode(new Uint8Array(proposal.title)),
        description: new TextDecoder().decode(new Uint8Array(proposal.description)),
        proposer: proposal.proposer,
        proposalType: proposal.proposal_type === '0' ? 'parameter_change' : 
                     proposal.proposal_type === '1' ? 'upgrade' : 'general',
        state: proposal.state,
        votesFor: parseFloat(proposal.votes_for) / Math.pow(10, 8),
        votesAgainst: parseFloat(proposal.votes_against) / Math.pow(10, 8),
        votesAbstain: parseFloat(proposal.votes_abstain) / Math.pow(10, 8),
        totalVotes: parseFloat(proposal.total_votes) / Math.pow(10, 8),
        quorumThreshold: parseFloat(proposal.quorum_threshold) / Math.pow(10, 8),
        startTime: parseInt(proposal.start_time),
        endTime: parseInt(proposal.end_time),
        executionTime: parseInt(proposal.execution_time),
        createdAt: parseInt(proposal.created_at)
      };
    } catch (err) {
      console.error('Failed to fetch proposal:', err);
      return null;
    }
  }, [aptos]);

  // Fetch user's voting power
  const fetchUserVotingPower = useCallback(async () => {
    if (!connected || !address) return;

    try {
      const response = await aptos.view({
        payload: {
          function: buildFunctionName('GOVERNANCE', 'getUserVotingPower'),
          type_arguments: [],
          arguments: [address]
        }
      });

      const votingPower = parseFloat(response[0]) / Math.pow(10, 8);
      setUserVotingPower(votingPower);
      
      return votingPower;
    } catch (err) {
      console.error('Failed to fetch voting power:', err);
      setUserVotingPower(0);
      return 0;
    }
  }, [connected, address, aptos]);

  // Get proposal state (active, pending, etc.)
  const getProposalState = useCallback(async (proposalId) => {
    try {
      const response = await aptos.view({
        payload: {
          function: buildFunctionName('GOVERNANCE', 'getProposalState'),
          type_arguments: [],
          arguments: [proposalId.toString()]
        }
      });

      const stateNum = response[0];
      const states = ['pending', 'active', 'succeeded', 'defeated', 'executed'];
      return states[parseInt(stateNum)] || 'unknown';
    } catch (err) {
      console.error('Failed to fetch proposal state:', err);
      return 'unknown';
    }
  }, [aptos]);

  // Utility functions
  const isProposalActive = useCallback((proposal) => {
    const now = Date.now() / 1000;
    return proposal.startTime <= now && now <= proposal.endTime && proposal.state === 'active';
  }, []);

  const hasQuorum = useCallback((proposal) => {
    return proposal.totalVotes >= proposal.quorumThreshold;
  }, []);

  const getVotingTimeLeft = useCallback((proposal) => {
    const now = Date.now() / 1000;
    if (proposal.endTime <= now) return 0;
    return proposal.endTime - now;
  }, []);

  // Auto-refresh data
  useEffect(() => {
    fetchProposals();

    if (connected && address) {
      fetchUserVotingPower();
    }

    // Set up polling for updates
    const interval = setInterval(() => {
      fetchProposals();
      if (connected && address) {
        fetchUserVotingPower();
      }
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [connected, address, fetchProposals, fetchUserVotingPower]);

  return {
    // Actions
    createProposal,
    vote,
    executeProposal,
    fetchProposals,
    fetchProposal,
    fetchUserVotingPower,
    getProposalState,
    
    // State
    loading,
    error,
    proposals,
    userVotingPower,
    
    // Utils
    isProposalActive,
    hasQuorum,
    getVotingTimeLeft,
    clearError: () => setError(null)
  };
};

export default useGovernance;
