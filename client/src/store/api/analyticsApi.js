import { createApi } from "@reduxjs/toolkit/query/react";
import axiosBaseQuery from "../../Helper/axiosBaseQuery.js";

export const analyticsApi = createApi({
    reducerPath: "analyticsApi",
    baseQuery: axiosBaseQuery({ baseUrl: "/api/v1" }),
    tagTypes: ["History", "Stats", "Identity"],
    endpoints: (builder) => ({
        // Analytics
        getHistory: builder.query({
            query: ({ page = 1, limit = 10 }) => ({ url: `/analytics/history?page=${page}&limit=${limit}`, method: "GET" }),
            providesTags: ["History"],
        }),
        getAdvancedStats: builder.query({
            query: () => ({ url: "/analytics/stats", method: "GET" }),
            providesTags: ["Stats"],
        }),

        getAllIdentities: builder.query({
            query: () => ({ url: "/identity/all", method: "GET" }),
            providesTags: ["Identity"],
        }),
        registerFace: builder.mutation({
            query: (formData) => ({
                url: "/face/register",
                method: "POST",
                data: formData,
                headers: { "Content-Type": "multipart/form-data" },
            }),
            invalidatesTags: ["Identity"],
        }),
        updateIdentity: builder.mutation({
            query: ({ id, data }) => ({
                url: `/identity/${id}`,
                method: "PATCH",
                data,
            }),
            invalidatesTags: ["Identity"],
        }),
        deleteIdentity: builder.mutation({
            query: (id) => ({
                url: `/identity/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: ["Identity"],
        }),

        // Forensic & Reporting
        forensicSearch: builder.mutation({
            query: (formData) => ({
                url: "/analytics/forensic-search",
                method: "POST",
                data: formData,
                headers: { "Content-Type": "multipart/form-data" },
            }),
        }),
        getReport: builder.query({
            query: ({ start, end, page = 1, limit = 10 }) => ({
                url: `/analytics/report?start=${start}&end=${end}&page=${page}&limit=${limit}`,
                method: "GET",
            }),
        }),
    }),
});

export const {
    useGetHistoryQuery,
    useGetAdvancedStatsQuery,
    useGetAllIdentitiesQuery,
    useRegisterFaceMutation,
    useUpdateIdentityMutation,
    useDeleteIdentityMutation,
    useForensicSearchMutation,
    useGetReportQuery
} = analyticsApi;
