// 4. Admin: Login: POST /api/admin/login
  if (upperMethod === 'POST' && normalizedPath === '/api/admin/login') {
    const { username, password } = body || {};
    const cleanUser = String(username || '').trim().toLowerCase();
    const cleanPass = String(password || '').trim();

    if (!cleanUser || !cleanPass) {
      return { status: 400, data: { error: 'Username/Email and password are required.' } };
    }

    // ====== YEAHAN HUMNE CHANGE KIYA HAI ======
    // Ab code Netlify ke environment variables se data uthayega!
    const envAdminUser = process.env.ADMIN_USERNAME || 'admin';
    const envAdminPass = process.env.ADMIN_PASSWORD || 'admin123';
    
    // File fallback (sirf local ke liye)
    const config = readJson(ADMIN_CONFIG_FILE, {
      adminUsername: envAdminUser,
      adminEmail: 'furqannaveed377@gmail.com',
      salt: 'fn_portfolio_salt_2026'
    });

    const salt = config.salt || 'fn_portfolio_salt_2026';
    const inputHash = hashPassword(cleanPass, salt);

    // Password check (Environment variable se ya hardcoded se)
    const isMatch = (
      cleanPass === envAdminPass ||
      cleanPass === 'admin123' ||
      cleanPass === 'admin' ||
      (config.passwordHint && cleanPass === config.passwordHint) ||
      (config.passwordHash && inputHash === config.passwordHash)
    );

    const configuredUser = String(config.adminUsername || envAdminUser).toLowerCase();
    const configuredEmail = String(config.adminEmail || 'furqannaveed377@gmail.com').toLowerCase();

    // User check
    const isUserValid = (
      cleanUser === envAdminUser ||
      cleanUser === 'admin' ||
      cleanUser === 'furqan' ||
      cleanUser === 'furqannaveed' ||
      cleanUser === 'furqannaveed377' ||
      cleanUser === configuredUser ||
      cleanUser === configuredEmail
    );
    // ===========================================

    if (isMatch && isUserValid) {
      const token = crypto.randomBytes(32).toString('hex');
      const newSession = {
        token,
        username: config.adminUsername,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      };

      const sessions = (config.activeSessions || []).filter(s => new Date(s.expiresAt) > new Date());
      sessions.push(newSession);
      config.activeSessions = sessions;
      
      // Koshish karte hain ke token save ho jaye, warna session based hi theek hai
      writeJson(ADMIN_CONFIG_FILE, config);

      return {
        status: 200,
        data: {
          success: true,
          token,
          username: config.adminUsername,
          email: config.adminEmail
        }
      };
    }

    return { status: 401, data: { error: 'Invalid username or password.' } };
  }
