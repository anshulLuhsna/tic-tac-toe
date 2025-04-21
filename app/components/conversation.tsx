'use client';

import React, { useCallback, useRef, useState, useEffect } from 'react';
import { useConversation } from '@11labs/react';

// Customer leads data structure
interface CustomerLead {
  id: number;
  name: string;
  countryInterest: string;
  univInterest: string;
  finished: boolean;
}

export function Conversation() {
  // Initial customer leads data
  const initialLeads: CustomerLead[] = [
    { id: 1, name: 'John Smith', countryInterest: '', univInterest: '', finished: false },
    { id: 2, name: 'Emma Johnson', countryInterest: '', univInterest: '', finished: false },
    { id: 3, name: 'Michael Chen', countryInterest: '', univInterest: '', finished: false },
  ];

  const [leads, setLeads] = useState<CustomerLead[]>(initialLeads);
  const [selectedLeadId, setSelectedLeadId] = useState<number>(0);
  const [status, setStatus] = useState('');
  const [ttsMessage, setTtsMessage] = useState('');
  const [isPlayingTts, setIsPlayingTts] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Fixed agent name
  const agentName = "Anshul";

  const conversation = useConversation({
    onConnect: () => {
      console.log('Connected - Timestamp:', new Date().toISOString());
      console.log('Connection status after connect:', conversation.status);
      setStatus('Call connected');
    },
    onDisconnect: (reason) => {
      console.log('Disconnected - Timestamp:', new Date().toISOString());
      console.log('Disconnect reason:', reason);
      console.log('Connection status after disconnect:', conversation.status);
      setStatus(`Call ended${reason ? ': ' + reason : ''}`);
    },
    onMessage: (message) => {
      console.log('Message received:', message);
      console.log('Message timestamp:', new Date().toISOString());
    },
    onError: (error) => {
      console.error('Error - Timestamp:', new Date().toISOString());
      console.error('Error details:', error);
      console.error('Connection status at error:', conversation.status);
      setStatus(`Error: ${typeof error === 'string' ? error : 'Something went wrong'}`);
    },
  });

    
 

  // Generate and play TTS message
  const playTtsMessage = async (message: string) => {
    try {
      setIsPlayingTts(true);
      setTtsMessage(message);
      
      // Call the ElevenLabs API to generate TTS
      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: message }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate speech');
      }
      
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.play();
      }
    } catch (error) {
      console.error('Error generating TTS:', error);
      setIsPlayingTts(false);
    }
  };

  const clientTools = {
    updateLead: async ({ leadId, field, value }: { leadId: string; field: string; value: string }) => {
      console.log(`[updateLead] ${leadId} → ${field} = "${value}"`);
  
      // Always target the currently selected lead
      const effectiveId = selectedLeadId;
      console.log(`[updateLead] forcing id to ${effectiveId}`);
  
      // Validate
      const validFields = ['countryInterest', 'univInterest', 'finished'];
      if (!validFields.includes(field)) {
        console.error(`[updateLead] Invalid field "${field}"`);
        return { success: false, error: `Invalid field: ${field}` };
      }
  
      // We'll capture the newly updated lead here
      let updatedLeadRecord: CustomerLead | undefined;
  
      // Functional update: prevLeads is guaranteed to be the latest
      setLeads(prevLeads =>
        prevLeads.map(lead => {
          if (lead.id === effectiveId) {
            const updatedLead: CustomerLead = {
              ...lead,
              [field]: field === 'finished' ? value === 'true' : value,
            };
            updatedLeadRecord = updatedLead;    // stash for the return
            console.log('[updateLead] merged state:', updatedLead);
            return updatedLead;
          }
          return lead;
        })
      );
  
     
  
      return {
        success: true,
        leadId: effectiveId,
        field,
        value,
        currentState: updatedLeadRecord,      // full record after merge
      };
    },
  };
  const stopConversation = useCallback(async () => {
    await conversation.endSession();
    await clientTools.updateLead({
      leadId: selectedLeadId.toString(),
      field: "finished",
      value: "true"
    });
  }, [conversation]);

  const startConversation = useCallback(async () => {
    if (selectedLeadId === 0) {
      setStatus('Please select a customer to call');
      return;
    }

    setStatus('Initializing call...');
    console.log('==================== NEW CALL START ====================');
    console.log('Starting conversation - Timestamp:', new Date().toISOString());
    console.log('Selected Lead ID:', selectedLeadId);
    console.log('Initial connection status:', conversation.status);

    try {
      // Ensure any previous session is properly closed
      
      
      // Request audio permissions first and ensure they're granted
      console.log('Requesting audio permissions...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('Audio permissions granted');
      
      // Create a temporary audio context to kickstart audio system
      console.log('Initializing audio context...');
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(audioContext.destination);
      source.disconnect();
      console.log('Audio context initialized');
      
      // Find the selected lead
      const selectedLead = leads.find(lead => lead.id === selectedLeadId);
      if (!selectedLead) {
        console.error('Selected lead not found in leads array');
        setStatus('Selected customer not found');
        return;
      }
      console.log('Selected lead:', selectedLead);
      
      // Define a system prompt for the sales agent
      const systemPrompt = `You are a friendly educational consultant representing Global Education Advisors. 
      Your job is to understand the customer's educational preferences and collect information about:
      1. Their country of interest for studying abroad
      2. The type of university or program they're interested in
      
      Your name is ${agentName} and you're speaking with ${selectedLead.name}.
      
      IMPORTANT: You MUST update the customer's information using the EXACT customer ID: ${selectedLead.id}
      
      During the conversation:
      - Introduce yourself professionally
      - Ask about their country preferences for studying (use updateLead to record this)
      - Inquire about university interests (use updateLead to record this)
      - Use a SEPARATE updateLead call for EACH piece of information
      - DO NOT combine multiple pieces of information in one update
      - When you've collected all information, thank them and let them know you've updated their profile
      
      You have access to the following tool:
      - updateLead: Use this tool IMMEDIATELY after learning each preference
        Parameters:
        - leadId: ALWAYS use "${selectedLead.id}" (the customer's exact ID)
        - field: Use "countryInterest" for country, "univInterest" for university
        - value: The exact information for JUST THAT FIELD
      
      IMPORTANT: Make separate calls for different types of information. Do NOT overwrite one field with another.
      
      Examples:
      If customer says "I'm interested in studying in the USA", call:
      updateLead(leadId: "${selectedLead.id}", field: "countryInterest", value: "USA")
      
      Then if they mention "Stanford University", make a SEPARATE call:
      updateLead(leadId: "${selectedLead.id}", field: "univInterest", value: "Stanford University")
      
      Be conversational, friendly and professional.`;
      
      // Small delay to ensure everything is initialized
      console.log('Adding initialization delay...');
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log('Delay completed');
      
      setStatus('Starting call...');
      
      console.log('Preparing to start session with variables:');
      console.log('- Agent ID:', 'EK03TEdzmpWUfU0TZdC9');
      console.log('- Dynamic Variables:', {
        selectedLeadname: selectedLead.name,
        selectedLeadid: selectedLead.id.toString()
      });
      
      console.log('Starting conversation.startSession()...');
      await conversation.startSession({
        agentId: 'EK03TEdzmpWUfU0TZdC9',
        clientTools: {
          updateLead: async ({ leadId, field, value }) => {
            console.log('Client tool updateLead called with:', { leadId, field, value });
            // Always use the currently selected lead ID
            const result = await clientTools.updateLead({ 
              leadId: selectedLeadId.toString(), 
              field, 
              value 
            });
            console.log('Client tool updateLead result:', result);
            return JSON.stringify(result);
          }
        },
        dynamicVariables: { 
          selectedLeadname: selectedLead.name,
          selectedLeadid: selectedLead.id.toString()
        }
      });
      console.log('startSession completed, connection status:', conversation.status);
    } catch (err) {
      console.error('=============================================');
      console.error('[startConversation] Failed to start:', err);
      console.error('Error type:', err instanceof Error ? err.constructor.name : typeof err);
      console.error('Error message:', err instanceof Error ? err.message : 'Unknown error');
      console.error('Stack trace:', err instanceof Error ? err.stack : 'No stack trace');
      console.error('Connection status at error:', conversation.status);
      console.error('=============================================');
      setStatus(`Error starting call: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [conversation, selectedLeadId, leads, agentName]);

 

  const resetLeads = useCallback(() => {
    const initialLeads: CustomerLead[] = [
      { id: 1, name: 'John Smith', countryInterest: '', univInterest: '', finished: false },
      { id: 2, name: 'Emma Johnson', countryInterest: '', univInterest: '', finished: false },
      { id: 3, name: 'Michael Chen', countryInterest: '', univInterest: '', finished: false },
    ];
    setLeads(initialLeads);
    setSelectedLeadId(0);
    setStatus('');
  }, []);

  return (
    <div className="flex flex-col items-center gap-4 p-4 w-full max-w-4xl bg-black text-white">
      <h1 className="text-2xl font-bold mb-4 text-white">Sales Agent Dashboard</h1>
      
      <div className="w-full mb-4">
        <label htmlFor="customerSelect" className="block text-sm font-medium text-white mb-1">
          Select Customer to Call:
        </label>
        <select
          id="customerSelect"
          value={selectedLeadId}
          onChange={(e) => setSelectedLeadId(Number(e.target.value))}
          className="w-full p-2 border rounded bg-gray-800 text-white border-gray-700"
          disabled={conversation.status === 'connected'}
        >
          <option value={0}>-- Select a customer --</option>
          {leads.map(lead => (
            <option key={lead.id} value={lead.id} disabled={lead.finished}>
              {lead.name} {lead.finished ? '(Completed)' : ''}
            </option>
          ))}
        </select>
      </div>
      
      <div className="w-full overflow-x-auto mb-4">
        <table className="min-w-full bg-black border border-gray-700">
          <thead className="bg-gray-900">
            <tr>
              <th className="py-2 px-4 border border-gray-700 text-left text-white">ID</th>
              <th className="py-2 px-4 border border-gray-700 text-left text-white">Name</th>
              <th className="py-2 px-4 border border-gray-700 text-left text-white">Country Interest</th>
              <th className="py-2 px-4 border border-gray-700 text-left text-white">University Interest</th>
              <th className="py-2 px-4 border border-gray-700 text-left text-white">Finished</th>
            </tr>
          </thead>
          <tbody>
            {leads.map(lead => (
              <tr key={lead.id} className={`${lead.id === selectedLeadId ? 'bg-blue-900' : ''} ${lead.finished ? 'bg-gray-800' : ''}`}>
                <td className="py-2 px-4 border border-gray-700 text-white">{lead.id}</td>
                <td className="py-2 px-4 border border-gray-700 text-white">{lead.name}</td>
                <td className="py-2 px-4 border border-gray-700 text-white">{lead.countryInterest || '-'}</td>
                <td className="py-2 px-4 border border-gray-700 text-white">{lead.univInterest || '-'}</td>
                <td className="py-2 px-4 border border-gray-700 text-white">{lead.finished ? 'Yes' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {status && (
        <div className={`mt-2 p-2 rounded w-full ${status.includes('Error') ? 'bg-red-900' : 'bg-blue-900'} text-white`}>
          <p className="text-sm">{status}</p>
        </div>
      )}

      {isPlayingTts && (
        <div className="mt-2 p-2 bg-blue-900 rounded w-full text-white">
          <p className="text-sm font-semibold">Playing message:</p>
          <p className="text-sm italic">{ttsMessage}</p>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={startConversation}
          disabled={conversation.status === 'connected' || isPlayingTts || selectedLeadId === 0}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-800 disabled:text-gray-500"
        >
          Start Call
        </button>
        <button
          onClick={stopConversation}
          disabled={conversation.status !== 'connected'}
          className="px-4 py-2 bg-red-500 text-black rounded disabled:bg-gray-300"
        >
          Stop Conversation
        </button>
        <button
          onClick={resetLeads}
          disabled={conversation.status === 'connected'}
          className="px-4 py-2 bg-yellow-600 text-white rounded disabled:bg-gray-800 disabled:text-gray-500"
        >
          Reset Data
        </button>
      </div>

      <div className="mt-2 p-2 bg-gray-900 rounded w-full flex items-center justify-between text-white">
        <div>
          <p className="text-sm">Connection status: <span className="font-medium">{conversation.status}</span></p>
          <p className="text-sm">Agent is: <span className="font-medium">{conversation.isSpeaking ? 'speaking' : 'listening'}</span></p>
        </div>
        {conversation.status === 'connected' && (
          <div className={`h-3 w-3 rounded-full ${conversation.isSpeaking ? 'bg-green-500' : 'bg-blue-500'} animate-pulse`}></div>
        )}
      </div>
    </div>
  );
}
