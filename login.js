const ACCOUNTS = [
  { username: "plat7k2m", pin: "8391", tier: "platinum" },
  { username: "plat9x4p", pin: "4726", tier: "platinum" },
  { username: "plat3r8n", pin: "6153", tier: "platinum" },
  { username: "plat6w1q", pin: "9284", tier: "platinum" },
  { username: "plat2v9z", pin: "3741", tier: "platinum" },
  { username: "plat8h5j", pin: "5068", tier: "platinum" },
  { username: "plat4y7t", pin: "7192", tier: "platinum" },
  { username: "plat5u3b", pin: "8437", tier: "platinum" },
  { username: "plat1m6c", pin: "2956", tier: "platinum" },
  { username: "plat0d2e", pin: "6384", tier: "platinum" },
  { username: "plat7p9l", pin: "8127", tier: "platinum" },
  { username: "plat3n6g", pin: "5463", tier: "platinum" },
  { username: "plat8t2r", pin: "7091", tier: "platinum" },
  { username: "plat5s1o", pin: "3728", tier: "platinum" },
  { username: "plat9w4k", pin: "8614", tier: "platinum" },
  { username: "plat2j7h", pin: "4935", tier: "platinum" },
  { username: "plat6z8a", pin: "1276", tier: "platinum" },
  { username: "plat4b5v", pin: "6549", tier: "platinum" },
  { username: "plat1x3c", pin: "9082", tier: "platinum" },
  { username: "plat7e9n", pin: "3861", tier: "platinum" },
  { username: "plat8u2m", pin: "7425", tier: "platinum" },
  { username: "plat5y7p", pin: "8193", tier: "platinum" },
  { username: "plat0h6k", pin: "2578", tier: "platinum" },
  { username: "plat3v8l", pin: "6942", tier: "platinum" },
  { username: "plat1t4j", pin: "5763", tier: "platinum" },
  { username: "plat9s2o", pin: "4319", tier: "platinum" },
  { username: "plat6w5b", pin: "9857", tier: "platinum" },
  { username: "plat2r7g", pin: "3486", tier: "platinum" },
  { username: "plat4m3h", pin: "8024", tier: "platinum" },
  { username: "plat8p1z", pin: "6192", tier: "platinum" },
  { username: "plat5n9x", pin: "7365", tier: "platinum" },
  { username: "plat0c6v", pin: "5248", tier: "platinum" },
  { username: "plat7j2k", pin: "9173", tier: "platinum" },
  { username: "plat1y8d", pin: "4698", tier: "platinum" },
  { username: "plat3q5m", pin: "1587", tier: "platinum" },
  { username: "plat8l4e", pin: "6824", tier: "platinum" },
  { username: "plat6f1n", pin: "9356", tier: "platinum" },
  { username: "plat9u7z", pin: "2743", tier: "platinum" },
  { username: "plat2h3r", pin: "8619", tier: "platinum" },
  { username: "plat5b8g", pin: "5072", tier: "platinum" },
  { username: "plat7s6m", pin: "4961", tier: "platinum" },
  { username: "plat1p9l", pin: "7238", tier: "platinum" },
  { username: "plat4w2n", pin: "3895", tier: "platinum" },
  { username: "plat8t5o", pin: "6417", tier: "platinum" },
  { username: "plat0k3d", pin: "8754", tier: "platinum" },
  { username: "plat6z7a", pin: "3128", tier: "platinum" },
  { username: "plat3r9f", pin: "5692", tier: "platinum" },
  { username: "plat5v1x", pin: "4283", tier: "platinum" },
  { username: "plat9m8y", pin: "7146", tier: "platinum" },
  { username: "plat2u4h", pin: "8913", tier: "platinum" },
  { username: "rslr6e9t", pin: "7482", tier: "reseller" },
  { username: "rslr1p4s", pin: "5269", tier: "reseller" },
  { username: "rslr8m3k", pin: "4197", tier: "reseller" },
  { username: "rslr2z7n", pin: "6853", tier: "reseller" },
  { username: "rslr5j0b", pin: "9714", tier: "reseller" },
  { username: "rslr7c2q", pin: "3546", tier: "reseller" },
  { username: "rslr9h6w", pin: "8925", tier: "reseller" },
  { username: "rslr3a8r", pin: "6378", tier: "reseller" },
  { username: "rslr4v1d", pin: "2694", tier: "reseller" },
  { username: "rslr0f5x", pin: "7135", tier: "reseller" },
  { username: "rslr8y3t", pin: "4598", tier: "reseller" },
  { username: "rslr1b7m", pin: "8261", tier: "reseller" },
  { username: "rslr6p4l", pin: "9473", tier: "reseller" },
  { username: "rslr3u9n", pin: "5724", tier: "reseller" },
  { username: "rslr7s2j", pin: "3186", tier: "reseller" },
  { username: "rslr5t8z", pin: "7645", tier: "reseller" },
  { username: "rslr9h1k", pin: "8397", tier: "reseller" },
  { username: "rslr0g6m", pin: "2856", tier: "reseller" },
  { username: "rslr2f4b", pin: "6193", tier: "reseller" },
  { username: "rslr7q5p", pin: "4728", tier: "reseller" },
  { username: "rslr4w9r", pin: "9531", tier: "reseller" },
  { username: "rslr1c8e", pin: "5674", tier: "reseller" },
  { username: "rslr6n3h", pin: "8349", tier: "reseller" },
  { username: "rslr8v2z", pin: "2957", tier: "reseller" },
  { username: "rslr5o7t", pin: "7186", tier: "reseller" },
];

const attempts = new Map();
const MAX_ATTEMPTS = 10;
const WINDOW_MS = 10 * 60 * 1000;

function isRateLimited(ip) {
  const now = Date.now();
  const record = attempts.get(ip);
  if (!record || now - record.firstAttempt > WINDOW_MS) {
    attempts.set(ip, { count: 1, firstAttempt: now });
    return false;
  }
  record.count += 1;
  return record.count > MAX_ATTEMPTS;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, message: "Method not allowed" });
    return;
  }

  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "unknown";

  if (isRateLimited(ip)) {
    res.status(429).json({
      success: false,
      message: "Terlalu banyak percobaan login. Coba lagi dalam beberapa menit.",
    });
    return;
  }

  const body = req.body || {};
  const username = String(body.username || "").trim().toLowerCase();
  const pin = String(body.pin || "").trim();

  if (!username || !pin) {
    res.status(400).json({ success: false, message: "Username dan PIN wajib diisi" });
    return;
  }

  const found = ACCOUNTS.find(
    (acc) => acc.username.toLowerCase() === username && acc.pin === pin
  );

  if (!found) {
    res.status(401).json({ success: false, message: "Username atau PIN salah" });
    return;
  }

  res.status(200).json({
    success: true,
    username: found.username,
    tier: found.tier,
  });
};
