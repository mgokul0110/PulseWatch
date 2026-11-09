
const axios = require("axios");
const pool = require("../config/db");
const dns = require("dns").promises;
const net = require("net");
const http = require("http");
const https = require("https");

// Separate blocklists for IPv4 and IPv6.
const blockedIPv4 = new net.BlockList();
const blockedIPv6 = new net.BlockList();

const ipv4Ranges = [
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

const ipv6Ranges = [
  ["::", 128],
  ["::1", 128],
  ["::ffff:0:0", 96],
  ["64:ff9b:1::", 48],
  ["100::", 64],
  ["2001::", 23],
  ["2001:db8::", 32],
  ["2002::", 16],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
];

ipv4Ranges.forEach(([address, prefix]) => {
  blockedIPv4.addSubnet(address, prefix, "ipv4");
});

ipv6Ranges.forEach(([address, prefix]) => {
  blockedIPv6.addSubnet(address, prefix, "ipv6");
});

// Check whether an IP is publicly routable.
const isPublicIP = (address) => {
  const version = net.isIP(address);

  if (version === 4) {
    return !blockedIPv4.check(address, "ipv4");
  }

  if (version === 6) {
    return !blockedIPv6.check(address, "ipv6");
  }

  return false;
};

// Resolve and validate the monitor destination.
const resolvePublicAddress = async (url) => {
  const parsedURL = new URL(url);

  if (!["http:", "https:"].includes(parsedURL.protocol)) {
    throw new Error("Only HTTP and HTTPS URLs are allowed");
  }

  if (parsedURL.username || parsedURL.password) {
    throw new Error("URLs containing credentials are not allowed");
  }

  const hostname = parsedURL.hostname
    .replace(/^\[|\]$/g, "")
    .toLowerCase()
    .replace(/\.$/, "");

  if (
    !hostname ||
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    throw new Error("Local and internal hostnames are not allowed");
  }

  // Direct IP address.
  const version = net.isIP(hostname);

  if (version) {
    if (!isPublicIP(hostname)) {
      throw new Error("Private or reserved IP addresses are not allowed");
    }

    return {
      hostname,
      address: hostname,
      family: version,
    };
  }

  // Resolve hostname and validate every returned address.
  const addresses = await dns.lookup(hostname, {
    all: true,
    verbatim: true,
  });

  if (addresses.length === 0) {
    throw new Error("Hostname could not be resolved");
  }

  const unsafeAddress = addresses.find(
    (entry) => !isPublicIP(entry.address)
  );

  if (unsafeAddress) {
    throw new Error(
      "Hostname resolves to a private or reserved IP address"
    );
  }

  // Pin the request to the first validated address.
  return {
    hostname,
    address: addresses[0].address,
    family: addresses[0].family,
  };
};

// CHECK MONITOR
const checkMonitor = async (monitor) => {
  const startTime = Date.now();

  let statusCode = null;
  let responseTime = null;
  let isSuccess = false;
  let errorMessage = null;

  try {
    const destination = await resolvePublicAddress(monitor.url);

    // Use the validated IP instead of resolving DNS again.
    const pinnedLookup = (hostname, options, callback) => {
      if (
        hostname.toLowerCase() !==
        destination.hostname.toLowerCase()
      ) {
        return callback(new Error("Unexpected request hostname"));
      }

      if (options && options.all) {
        return callback(null, [
          {
            address: destination.address,
            family: destination.family,
          },
        ]);
      }

      return callback(
        null,
        destination.address,
        destination.family
      );
    };

    const response = await axios({
      method: monitor.method,
      url: monitor.url,
      timeout: 10000,
      maxRedirects: 0,
      proxy: false,

      httpAgent: new http.Agent({
        lookup: pinnedLookup,
      }),

      httpsAgent: new https.Agent({
        lookup: pinnedLookup,
      }),

      validateStatus: () => true,
    });

    statusCode = response.status;
    responseTime = Date.now() - startTime;

    isSuccess = statusCode === monitor.expected_status;

    if (!isSuccess) {
      errorMessage =
        `Expected ${monitor.expected_status}, received ${statusCode}`;
    }
  } catch (error) {
    responseTime = Date.now() - startTime;

    if (error.response) {
      statusCode = error.response.status;
    }

    errorMessage = error.message;
  }

  // Save check history.
  await pool.query(
    `INSERT INTO checks
      (monitor_id, status_code, response_time_ms, is_success, error_message)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      monitor.id,
      statusCode,
      responseTime,
      isSuccess,
      errorMessage,
    ]
  );

  // INCIDENT MANAGEMENT
  if (!isSuccess) {
    // The partial unique index prevents duplicate open incidents.
    const incident = await pool.query(
      `INSERT INTO incidents
        (monitor_id, reason, status)
       VALUES ($1, $2, 'open')
       ON CONFLICT (monitor_id) WHERE status = 'open'
       DO NOTHING
       RETURNING id`,
      [
        monitor.id,
        errorMessage || `Expected status ${monitor.expected_status}`,
      ]
    );

    if (incident.rowCount > 0) {
      console.log(`[Monitor: ${monitor.name}] INCIDENT OPENED`);
    }
  } else {
    // Resolve any existing open incident for this monitor.
    const resolved = await pool.query(
      `UPDATE incidents
       SET status = 'resolved',
           resolved_at = NOW()
       WHERE monitor_id = $1
         AND status = 'open'
       RETURNING id`,
      [monitor.id]
    );

    if (resolved.rowCount > 0) {
      console.log(`[Monitor: ${monitor.name}] INCIDENT RESOLVED`);
    }
  }

  return {
    monitorId: monitor.id,
    statusCode,
    responseTime,
    isSuccess,
    errorMessage,
  };
};

module.exports = {
  checkMonitor,
};
