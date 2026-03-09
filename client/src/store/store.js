import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import { faceApi } from "./api/faceApi.js";
import { analyticsApi } from "./api/analyticsApi.js";
import { objectApi } from "./api/objectApi.js";
import { zoneApi } from "./api/zoneApi.js";
import performanceReducer from "./slices/performanceSlice.js";
import uiReducer from "./slices/uiSlice.js";

export const store = configureStore({
    reducer: {
        [faceApi.reducerPath]: faceApi.reducer,
        [analyticsApi.reducerPath]: analyticsApi.reducer,
        [objectApi.reducerPath]: objectApi.reducer,
        [zoneApi.reducerPath]: zoneApi.reducer,
        performance: performanceReducer,
        ui: uiReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: false,
        }).concat(faceApi.middleware, analyticsApi.middleware, objectApi.middleware, zoneApi.middleware),
});

setupListeners(store.dispatch);
