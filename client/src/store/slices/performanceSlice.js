import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    latency: 0,
    throughput: 0,
    lastUpdated: null,
};

const performanceSlice = createSlice({
    name: 'performance',
    initialState,
    reducers: {
        updateMetrics: (state, action) => {
            const { latency, throughput } = action.payload;

            // Smoothing (EMA - Exponential Moving Average)
            // Efficient EMA (Exponential Moving Average) smoothing
            const alpha = 0.2; // Increased reactivity

            // If the improvement is massive (e.g. > 3x), jump to it immediately to reflect recovery
            if (state.latency > latency * 3) {
                state.latency = latency;
            } else {
                state.latency = state.latency === 0
                    ? latency
                    : Math.round(state.latency * (1 - alpha) + latency * alpha);
            }

            if (state.throughput < throughput / 3) {
                state.throughput = throughput;
            } else {
                state.throughput = state.throughput === 0
                    ? throughput
                    : Number((state.throughput * (1 - alpha) + throughput * alpha).toFixed(1));
            }

            state.lastUpdated = Date.now();
        },
        resetMetrics: (state) => {
            state.latency = 0;
            state.throughput = 0;
            state.lastUpdated = null;
        }
    },
});

export const { updateMetrics, resetMetrics } = performanceSlice.actions;
export default performanceSlice.reducer;
