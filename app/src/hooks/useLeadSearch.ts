import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Lead } from '../types';

const API_BASE = 'https://us-central1-kalvium-outreach-53f54.cloudfunctions.net/api';
const PAGE_SIZE = 20;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

export function useLeadSearch(userEmail?: string) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [globalResults, setGlobalResults] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (userEmail) {
      fetchLeads(userEmail);
    }
  }, [userEmail]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  const fetchLeads = async (email: string) => {
    try {
      setLoading(true);
      const cacheKey = `leads_cache_${email}`;
      
      // 1. Check local cache first (The "Filing Cabinet")
      const cachedStr = await AsyncStorage.getItem(cacheKey);
      let shouldUseNetwork = true;

      if (cachedStr) {
        try {
          const cached = JSON.parse(cachedStr);
          // Instantly show cached leads (Instant Load)
          setLeads(cached.leads || []);
          setLoading(false); // Stop loading spinner immediately
          
          // Check if cache is fresh enough (The "TTL")
          if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
            shouldUseNetwork = false; // Cache is fresh, save battery!
          }
        } catch (e) {
          // If JSON parse fails, ignore and fetch from network
        }
      }

      // 2. Fetch from network if cache is missing or expired
      if (shouldUseNetwork) {
        // We only show loading spinner if we didn't have a cache
        if (!cachedStr) setLoading(true); 

        const res = await fetch(`${API_BASE}/api/leads?email=${encodeURIComponent(email)}`);
        const data = await res.json();
        
        if (data.success) {
          const freshLeads = data.leads || [];
          setLeads(freshLeads);
          
          // Save new snapshot to local cache
          await AsyncStorage.setItem(cacheKey, JSON.stringify({
            leads: freshLeads,
            timestamp: Date.now()
          }));
        }
      }
    } catch (err) {
      console.error('Failed to fetch leads:', err);
    } finally {
      setLoading(false);
    }
  };

  const searchGlobal = useCallback(async () => {
    const q = globalSearchQuery.trim();
    if (q.length < 2) return;
    try {
      setGlobalLoading(true);
      const url = `${API_BASE}/api/leads/search?q=${encodeURIComponent(q)}&userEmail=${encodeURIComponent(userEmail || '')}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setGlobalResults(data.leads || []);
      }
    } catch (err) {
      console.error('Global search failed:', err);
    } finally {
      setGlobalLoading(false);
    }
  }, [globalSearchQuery]);

  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const filteredLeads = leads.filter((l) => {
    // Only show School Prospect leads
    if (l.ProspectStage && l.ProspectStage !== 'School Prospect') return false;
    
    const name = `${l.FirstName || ''} ${l.LastName || ''}`.toLowerCase();
    const city = (l.mx_City || '').toLowerCase();
    const q = debouncedSearchQuery.toLowerCase();
    return name.includes(q) || city.includes(q);
  });

  const paginatedLeads = filteredLeads.slice(0, page * PAGE_SIZE);

  const loadMoreLeads = () => {
    if (page * PAGE_SIZE < filteredLeads.length) {
      setPage((prev) => prev + 1);
    }
  };

  const clearGlobalSearch = () => {
    setGlobalSearchQuery('');
    setGlobalResults([]);
  };

  const refresh = useCallback(async () => {
    if (!userEmail) return;
    setIsRefreshing(true);
    try {
      const res = await fetch(`${API_BASE}/api/leads?email=${encodeURIComponent(userEmail)}`);
      const data = await res.json();
      if (data.success) {
        const freshLeads = data.leads || [];
        setLeads(freshLeads);
        await AsyncStorage.setItem(`leads_cache_${userEmail}`, JSON.stringify({
          leads: freshLeads,
          timestamp: Date.now()
        }));
      }
    } catch (err) {
      console.error('Failed to refresh leads:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [userEmail]);

  const prependLead = useCallback((newLead: Lead) => {
    setLeads((prev) => [newLead, ...prev]);
  }, []);

  return {
    leads,
    filteredLeads,
    paginatedLeads,
    globalResults,
    loading,
    globalLoading,
    isRefreshing,
    searchQuery,
    setSearchQuery,
    globalSearchQuery,
    setGlobalSearchQuery,
    searchGlobal,
    loadMoreLeads,
    clearGlobalSearch,
    refresh,
    prependLead,
  };
}
