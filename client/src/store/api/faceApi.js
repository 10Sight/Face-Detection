import { createApi } from "@reduxjs/toolkit/query/react";
import axiosBaseQuery from "../../Helper/axiosBaseQuery.js";

export const faceApi = createApi({
    reducerPath: "faceApi",
    baseQuery: axiosBaseQuery({ baseUrl: "/api/v1/face" }),
    tagTypes: ["Face"],
    endpoints: (builder) => ({
        detectFace: builder.mutation({
            query: ({ formData, params }) => ({
                url: `/detect${params?.is_static ? '?is_static=true' : ''}`,
                method: "POST",
                data: formData,
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            }),
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
    }),
});

export const { useDetectFaceMutation, useRegisterFaceMutation } = faceApi;
