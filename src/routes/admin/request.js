
const express = require('express');
const adminMiddleware = require('../../middleware/admin');

const {
  findAll,
  findByStatus,
  findRequestById,
  approveRequest,
  rejectRequest,
} = require("../../repositories/requestRepository");

const router = express.Router();

router.get('/', adminMiddleware, async (req, res) => {
  try {
    const { status } = req.query;
    const requests = status ? await findByStatus(status) : await findAll();
    return res.status(200).json({ data: requests });
  } catch (err) {
    console.error('[requests] Error fetching requests:', err.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /admin/requests/:id
router.get("/:id", adminMiddleware, async (req, res) => {
  try {
    const request = await findRequestById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }
    return res.json(request);
  } catch (err) {
    console.error("[request] Error:", err.message);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// PATCH /admin/requests/:id/accept
// Body: { action: "approved" | "rejected" }
router.patch("/:id/accept", adminMiddleware, async (req, res) => {
  const { action } = req.body;
  const requestId = req.params.id;
  const adminWallet = req.user.wallet;

  if (!action || !["approved", "rejected"].includes(action)) {
    return res
      .status(400)
      .json({ message: "action must be 'approved' or 'rejected'" });
  }

  try {
    if (action === "rejected") {
      const request = await rejectRequest(requestId, adminWallet);
      return res.json({
        message: "Request rejected",
        request,
      });
    }

    // Approved → Transaction Block (Request + Users)
    const { request, user } = await approveRequest(requestId, adminWallet);
    return res.json({
      message: "Request approved, user upgraded to breeder",
      request,
      user: {
        wallet_address: user.wallet_address,
        name: user.name,
        type: user.type,
      },
    });
  } catch (err) {
    console.error("[request] Accept error:", err.message);

    if (err.message === "Request not found") {
      return res.status(404).json({ message: err.message });
    }
    if (err.message === "Request is not pending") {
      return res.status(409).json({ message: err.message });
    }
    if (err.message === "User not found") {
      return res.status(404).json({ message: err.message });
    }

    return res.status(500).json({ message: "Internal server error" });

  }
});

module.exports = router;
