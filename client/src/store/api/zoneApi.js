import { createApi } from "@reduxjs/toolkit/query/react";
import axiosBaseQuery from "../../Helper/axiosBaseQuery.js";

export const zoneApi = createApi({
    reducerPath: "zoneApi",
    baseQuery: axiosBaseQuery({ baseUrl: "/api/v1/zones" }),
    tagTypes: ["Zone"],
    endpoints: (builder) => ({
        getZones: builder.query({
            query: (cameraId) => ({
                url: `/camera/${cameraId}`,
                method: "GET",
            }),
            providesTags: (result) =>
                result ? [...result.data.map(({ _id }) => ({ type: "Zone", id: _id })), "Zone"] : ["Zone"],
        }),
        createZone: builder.mutation({
            query: (data) => ({
                url: "/",
                method: "POST",
                data,
            }),
            invalidatesTags: ["Zone"],
        }),
        deleteZone: builder.mutation({
            query: (id) => ({
                url: `/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: ["Zone"],
        }),
    }),
});

export const {
    useGetZonesQuery,
    useCreateZoneMutation,
    useDeleteZoneMutation
} = zoneApi;
