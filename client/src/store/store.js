import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import { faceApi } from "./api/faceApi.js";
import { analyticsApi } from "./api/analyticsApi.js";

export const store = configureStore({
    reducer: {
        [faceApi.reducerPath]: faceApi.reducer,
        [analyticsApi.reducerPath]: analyticsApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: false,
        }).concat(faceApi.middleware, analyticsApi.middleware),
});

setupListeners(store.dispatch);
