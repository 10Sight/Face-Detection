import { Face } from "../models/face.model.js";
import { Watchlist } from "../models/watchlist.model.js";

/**
 * Retrieves all registered identities enriched with watchlist status.
 */
export const fetchAllIdentities = async () => {
    const identities = await Face.find({}).select("-embedding");

    return await Promise.all(identities.map(async (id) => {
        const watchlistEntry = await Watchlist.findOne({ faceId: id._id });
        return {
            ...id.toObject(),
            watchlist: watchlistEntry ? {
                type: watchlistEntry.type,
                severity: watchlistEntry.severity,
                notes: watchlistEntry.notes
            } : null
        };
    }));
};

/**
 * Updates an identity's metadata and its watchlist entry.
 */
export const updateIdentityRecord = async (id, { name, watchlist }) => {
    const identity = await Face.findById(id);
    if (!identity) throw new Error("Identity not found");

    if (name) identity.name = name;
    await identity.save();

    if (watchlist) {
        await Watchlist.findOneAndUpdate(
            { faceId: id },
            {
                type: watchlist.type,
                severity: watchlist.severity,
                notes: watchlist.notes,
                isActive: true
            },
            { upsert: true, new: true }
        );
    }
    return identity;
};

/**
 * Registers a new identity with face embedding and watchlist data.
 */
export const registerNewIdentity = async ({ name, embedding, watchlist, userId }) => {
    const face = await Face.create({
        name,
        embedding,
        userId: userId || null
    });

    if (watchlist) {
        await Watchlist.create({
            faceId: face._id,
            type: watchlist.type,
            severity: watchlist.severity || "Medium",
            notes: watchlist.notes || "",
            isActive: true
        });
    }

    return face;
};

/**
 * Purges an identity and its security metadata.
 */
export const purgeIdentityRecord = async (id) => {
    await Face.findByIdAndDelete(id);
    await Watchlist.findOneAndDelete({ faceId: id });
    return true;
};
