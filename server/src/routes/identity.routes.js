import { Router } from "express";
import { getAllIdentities, updateIdentity, deleteIdentity } from "../controllers/identity.controller.js";

const router = Router();

router.route("/all").get(getAllIdentities);
router.route("/:id").patch(updateIdentity).delete(deleteIdentity);

export default router;
