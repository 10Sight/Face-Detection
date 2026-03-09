import { createApi } from "@reduxjs/toolkit/query/react";
import axiosBaseQuery from "../../Helper/axiosBaseQuery.js";

export const objectApi = createApi({
    reducerPath: "objectApi",
    baseQuery: axiosBaseQuery({ baseUrl: "/api/v1/object" }),
    tagTypes: ["Object"],
    endpoints: (builder) => ({
        registerObject: builder.mutation({
            query: (data) => ({
                url: "/register",
                method: "POST",
                data,
            }),
            invalidatesTags: ["Object"],
        }),
        registerObjectFromImage: builder.mutation({
            query: (formData) => ({
                url: "/register-image",
                method: "POST",
                data: formData,
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            }),
            invalidatesTags: ["Object"],
        }),
        getAllObjects: builder.query({
            query: () => ({
                url: "/",
                method: "GET",
            }),
            providesTags: ["Object"],
        }),
        deleteObject: builder.mutation({
            query: (id) => ({
                url: `/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: ["Object"],
        }),
    }),
});

export const {
    useRegisterObjectMutation,
    useRegisterObjectFromImageMutation,
    useGetAllObjectsQuery,
    useDeleteObjectMutation
} = objectApi;
