import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://footy-picker-15607b8ba05c.herokuapp.com';
const PLAYERS_CACHE_KEY = 'footy_players_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

// Get cached players from localStorage
export const getCachedPlayers = () => {
    try {
        const cached = localStorage.getItem(PLAYERS_CACHE_KEY);
        if (!cached) return null;

        const { data, timestamp } = JSON.parse(cached);
        const now = Date.now();

        // Check if cache is still valid
        if (now - timestamp < CACHE_DURATION) {
            return data;
        } else {
            // Cache expired, remove it
            localStorage.removeItem(PLAYERS_CACHE_KEY);
            return null;
        }
    } catch (error) {
        console.error('Error reading players cache:', error);
        localStorage.removeItem(PLAYERS_CACHE_KEY);
        return null;
    }
};

// Set players cache in localStorage
export const setCachedPlayers = (players) => {
    try {
        const cacheData = {
            data: players,
            timestamp: Date.now()
        };
        localStorage.setItem(PLAYERS_CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
        console.error('Error setting players cache:', error);
    }
};

// Invalidate players cache
export const invalidatePlayersCache = () => {
    try {
        localStorage.removeItem(PLAYERS_CACHE_KEY);
        console.log('Players cache invalidated');
    } catch (error) {
        console.error('Error invalidating players cache:', error);
    }
};// Fetch players from API
export const fetchPlayersFromAPI = async (getAccessTokenSilently) => {
    const token = await getAccessTokenSilently();
    const { data } = await axios.get(`${API_BASE_URL}/players`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return data;
};

// Main function to get players with caching
export const fetchPlayersWithCache = async (getAccessTokenSilently, setPlayers, setLoading) => {
    try {
        // Check cache first
        const cachedPlayers = getCachedPlayers();

        if (cachedPlayers) {
            // Use cached data immediately
            const sortedData = cachedPlayers.sort((a, b) => a.name.localeCompare(b.name));
            setPlayers(sortedData);
            setLoading(false);

            // Fetch fresh data in background to update cache
            try {
                const freshData = await fetchPlayersFromAPI(getAccessTokenSilently);
                setCachedPlayers(freshData);
                const sortedFreshData = freshData.sort((a, b) => a.name.localeCompare(b.name));
                setPlayers(sortedFreshData);
            } catch (error) {
                console.error('Background refresh failed:', error);
                // Continue with cached data
            }
        } else {
            // No cache, fetch from API
            setLoading(true);
            const freshData = await fetchPlayersFromAPI(getAccessTokenSilently);
            setCachedPlayers(freshData);
            const sortedData = freshData.sort((a, b) => a.name.localeCompare(b.name));
            setPlayers(sortedData);
            setLoading(false);
        }
    } catch (error) {
        console.error('Error fetching players:', error);
        setLoading(false);
    }
};

// Hook for using cached players
export const useCachedPlayers = () => {
    const { getAccessTokenSilently } = useAuth0();

    return {
        getCachedPlayers,
        setCachedPlayers,
        invalidatePlayersCache,
        fetchPlayersFromAPI: () => fetchPlayersFromAPI(getAccessTokenSilently),
        fetchPlayersWithCache: (setPlayers, setLoading) =>
            fetchPlayersWithCache(getAccessTokenSilently, setPlayers, setLoading)
    };
};