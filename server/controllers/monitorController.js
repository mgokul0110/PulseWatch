
const pool = require("../config/db");
const dns = require("dns").promises;
const net = require("net");

// Allowed HTTP methods
const allowedMethods = ["GET", "POST", "PUT", "PATCH", "DELETE"];

// Block private, reserved and special-use IP ranges.
const blockedIPs = new net.BlockList();

const blockedIPv4Ranges = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
];

blockedIPv4Ranges.forEach(([address, prefix]) => {
  blockedIPs.addSubnet(address, prefix, "ipv4");
});

const blockedIPv6Ranges = [
  ["::", 128],
  ["::1", 128],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
  ["2001:db8::", 32],
];

blockedIPv6Ranges.forEach(([address, prefix]) => {
  blockedIPs.addSubnet(address, prefix, "ipv6");
});

// Check whether an IP address is public.
const isPublicIP = (address) => {
  const version = net.isIP(address);

  if (!version) return false;

  // Block IPv4-mapped IPv6 addresses.
  if (
    version === 6 &&
    address.toLowerCase().startsWith("::ffff:")
  ) {
    return false;
  }

  return !blockedIPs.check(
    address,
    version === 4 ? "ipv4" : "ipv6"
  );
};

// Validate URL and DNS resolution.
const validateMonitorURL = async (value) => {
  if (typeof value !== "string" || !value.trim()) {
    return {
      valid: false,
      message: "A valid URL is required",
    };
  }

  let parsedURL;

  try {
    parsedURL = new URL(value.trim());
  } catch {
    return {
      valid: false,
      message: "Invalid URL",
    };
  }

  if (!["http:", "https:"].includes(parsedURL.protocol)) {
    return {
      valid: false,
      message: "Only HTTP and HTTPS URLs are allowed",
    };
  }

  if (parsedURL.username || parsedURL.password) {
    return {
      valid: false,
      message: "URLs containing credentials are not allowed",
    };
  }

  const hostname = parsedURL.hostname
    .replace(/^\[|\]$/g, "")
    .toLowerCase();

  if (
    !hostname ||
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    return {
      valid: false,
      message: "Local and internal hostnames are not allowed",
    };
  }

  // Direct IP address validation.
  if (net.isIP(hostname)) {
    if (!isPublicIP(hostname)) {
      return {
        valid: false,
        message: "Private or reserved IP addresses are not allowed",
      };
    }

    return { valid: true };
  }

  // Resolve hostname and reject private/reserved DNS results.
  try {
    const addresses = await dns.lookup(hostname, {
      all: true,
      verbatim: true,
    });
    console.log(
  "DNS SECURITY CHECK:",
  addresses.map((entry) => ({
    address: entry.address,
    family: entry.family,
    isPublic: isPublicIP(entry.address),
  }))
);
    if (
      addresses.length === 0 ||
      addresses.some((entry) => !isPublicIP(entry.address))
    ) {
      return {
        valid: false,
        message: "URL resolves to a private or reserved IP address",
      };
    }
  } catch {
    return {
      valid: false,
      message: "Hostname could not be resolved",
    };
  }

  return { valid: true };
};

// CREATE MONITOR
const createMonitor = async (req, res) => {
  try {
    const {
      name,
      url,
      method = "GET",
      expectedStatus = 200,
      intervalSeconds = 300,
    } = req.body;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      name.trim().length > 150
    ) {
      return res.status(400).json({
        message: "Name is required and must be under 150 characters",
      });
    }

    const urlValidation = await validateMonitorURL(url);

    if (!urlValidation.valid) {
      return res.status(400).json({
        message: urlValidation.message,
      });
    }

    if (
      typeof method !== "string" ||
      !allowedMethods.includes(method.toUpperCase())
    ) {
      return res.status(400).json({
        message: "Invalid HTTP method",
      });
    }

    if (
      !Number.isInteger(Number(expectedStatus)) ||
      Number(expectedStatus) < 100 ||
      Number(expectedStatus) > 599
    ) {
      return res.status(400).json({
        message: "Expected status must be between 100 and 599",
      });
    }

    if (
      !Number.isInteger(Number(intervalSeconds)) ||
      Number(intervalSeconds) < 60 ||
      Number(intervalSeconds) > 86400
    ) {
      return res.status(400).json({
        message: "Interval must be between 60 and 86400 seconds",
      });
    }

    const result = await pool.query(
      `INSERT INTO monitors
        (user_id, name, url, method, expected_status, interval_seconds)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        req.user.userId,
        name.trim(),
        url.trim(),
        method.toUpperCase(),
        Number(expectedStatus),
        Number(intervalSeconds),
      ]
    );

    return res.status(201).json({
      message: "Monitor created successfully",
      monitor: result.rows[0],
    });
  } catch (error) {
    console.error("Create monitor error:", error);

    return res.status(500).json({
      message: "Could not create monitor",
    });
  }
};

// GET ALL MONITORS
const getMonitors = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT *
       FROM monitors
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.userId]
    );

    return res.json({
      monitors: result.rows,
    });
  } catch (error) {
    console.error("Get monitors error:", error);

    return res.status(500).json({
      message: "Could not load monitors",
    });
  }
};

// GET MONITOR BY ID
const getMonitorById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT *
       FROM monitors
       WHERE id = $1 AND user_id = $2`,
      [id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Monitor not found",
      });
    }

    return res.json({
      monitor: result.rows[0],
    });
  } catch (error) {
    console.error("Get monitor error:", error);

    return res.status(500).json({
      message: "Could not load monitor",
    });
  }
};

// UPDATE MONITOR
const updateMonitor = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      name,
      url,
      method,
      expectedStatus,
      intervalSeconds,
      isActive,
    } = req.body;

    if (name !== undefined) {
      if (
        typeof name !== "string" ||
        !name.trim() ||
        name.trim().length > 150
      ) {
        return res.status(400).json({
          message: "Name must be between 1 and 150 characters",
        });
      }
    }

    if (url !== undefined) {
      const urlValidation = await validateMonitorURL(url);

      if (!urlValidation.valid) {
        return res.status(400).json({
          message: urlValidation.message,
        });
      }
    }

    if (method !== undefined) {
      if (
        typeof method !== "string" ||
        !allowedMethods.includes(method.toUpperCase())
      ) {
        return res.status(400).json({
          message: "Invalid HTTP method",
        });
      }
    }

    if (
      expectedStatus !== undefined &&
      (
        !Number.isInteger(Number(expectedStatus)) ||
        Number(expectedStatus) < 100 ||
        Number(expectedStatus) > 599
      )
    ) {
      return res.status(400).json({
        message: "Expected status must be between 100 and 599",
      });
    }

    if (
      intervalSeconds !== undefined &&
      (
        !Number.isInteger(Number(intervalSeconds)) ||
        Number(intervalSeconds) < 60 ||
        Number(intervalSeconds) > 86400
      )
    ) {
      return res.status(400).json({
        message: "Interval must be between 60 and 86400 seconds",
      });
    }

    if (
      isActive !== undefined &&
      typeof isActive !== "boolean"
    ) {
      return res.status(400).json({
        message: "isActive must be a boolean",
      });
    }

    const result = await pool.query(
      `UPDATE monitors
       SET
         name = COALESCE($1, name),
         url = COALESCE($2, url),
         method = COALESCE($3, method),
         expected_status = COALESCE($4, expected_status),
         interval_seconds = COALESCE($5, interval_seconds),
         is_active = COALESCE($6, is_active)
       WHERE id = $7 AND user_id = $8
       RETURNING *`,
      [
        name !== undefined ? name.trim() : null,
        url !== undefined ? url.trim() : null,
        method !== undefined ? method.toUpperCase() : null,
        expectedStatus !== undefined ? Number(expectedStatus) : null,
        intervalSeconds !== undefined ? Number(intervalSeconds) : null,
        isActive !== undefined ? isActive : null,
        id,
        req.user.userId,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Monitor not found",
      });
    }

    return res.json({
      message: "Monitor updated successfully",
      monitor: result.rows[0],
    });
  } catch (error) {
    console.error("Update monitor error:", error);

    return res.status(500).json({
      message: "Could not update monitor",
    });
  }
};

// DELETE MONITOR
const deleteMonitor = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM monitors
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Monitor not found",
      });
    }

    return res.json({
      message: "Monitor deleted successfully",
    });
  } catch (error) {
    console.error("Delete monitor error:", error);

    return res.status(500).json({
      message: "Could not delete monitor",
    });
  }
};

module.exports = {
  createMonitor,
  getMonitors,
  getMonitorById,
  updateMonitor,
  deleteMonitor,
};
