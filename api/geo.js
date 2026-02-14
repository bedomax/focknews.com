const VALID_COUNTRIES = ['cl', 'ec'];

module.exports = async function handler(req, res) {
  try {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
      || req.socket?.remoteAddress;

    // For localhost/dev, default to 'cl'
    if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168')) {
      return res.json({ country: 'cl' });
    }

    const response = await fetch(`https://ipapi.co/${ip}/country_code/`);
    const code = (await response.text()).trim().toLowerCase();

    if (VALID_COUNTRIES.includes(code)) {
      return res.json({ country: code });
    }
    res.json({ country: 'cl' });
  } catch {
    res.json({ country: 'cl' });
  }
};
