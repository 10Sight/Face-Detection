import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    isSettingsOpen: false,
    unknownAlertsEnabled: true,
    suspiciousAlertsEnabled: true,
    showTimeline: true,
    isFullScreen: false,
};

const uiSlice = createSlice({
    name: 'ui',
    initialState,
    reducers: {
        toggleSettings: (state) => {
            state.isSettingsOpen = !state.isSettingsOpen;
        },
        openSettings: (state) => {
            state.isSettingsOpen = true;
        },
        closeSettings: (state) => {
            state.isSettingsOpen = false;
        },
        setUnknownAlerts: (state, action) => {
            state.unknownAlertsEnabled = action.payload;
        },
        setSuspiciousAlerts: (state, action) => {
            state.suspiciousAlertsEnabled = action.payload;
        },
        setTimelineVisibility: (state, action) => {
            state.showTimeline = action.payload;
        },
        toggleFullScreen: (state) => {
            state.isFullScreen = !state.isFullScreen;
        },
        setFullScreen: (state, action) => {
            state.isFullScreen = action.payload;
        },
    },
});

export const {
    toggleSettings,
    openSettings,
    closeSettings,
    setUnknownAlerts,
    setSuspiciousAlerts,
    setTimelineVisibility,
    toggleFullScreen,
    setFullScreen
} = uiSlice.actions;

export default uiSlice.reducer;
