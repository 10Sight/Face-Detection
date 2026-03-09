import { createApi } from "@reduxjs/toolkit/query/react";
import axiosBaseQuery from "../../Helper/axiosBaseQuery.js";

export const faceApi = createApi({
    reducerPath: "faceApi",
    baseQuery: axiosBaseQuery({ baseUrl: "/api/v1/face" }),
    tagTypes: ["Face"],
    endpoints: (builder) => ({
        detectFace: builder.mutation({
            query: ({ formData, params }) => {
                const queryParams = new URLSearchParams();
                if (params?.is_static) queryParams.append('is_static', 'true');
                if (params?.modes && Array.isArray(params.modes)) {
                    params.modes.forEach(mode => queryParams.append('modes', mode));
                }
                if (params?.timestamp_ms) {
                    queryParams.append('timestamp_ms', params.timestamp_ms);
                }
                if (params?.unknownAlertsEnabled !== undefined) {
                    queryParams.append('unknownAlertsEnabled', params.unknownAlertsEnabled);
                }
                if (params?.suspiciousAlertsEnabled !== undefined) {
                    queryParams.append('suspiciousAlertsEnabled', params.suspiciousAlertsEnabled);
                }
                return {
                    url: `/detect?${queryParams.toString()}`,
                    method: "POST",
                    data: formData,
                    headers: {
                        "Content-Type": "multipart/form-data",
                    },
                };
            },
        }),
        registerFace: builder.mutation({
            query: (formData) => ({
                url: "/register",
                method: "POST",
                data: formData,
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            }),
            invalidatesTags: ["Face"],
        }),
        getTelemetry: builder.query({
            query: () => ({
                url: "/telemetry",
                method: "GET",
            }),
        }),
    }),
});

export const { useDetectFaceMutation, useRegisterFaceMutation, useGetTelemetryQuery } = faceApi;
