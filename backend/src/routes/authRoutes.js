import { Router } from 'express';

export function createAuthRouter(auth) {
  const router = Router();

  router.post('/login', async (req, res, next) => {
    try {
      const { email, password } = req.body || {};
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_CREDENTIALS', message: 'Email and password are required' }
        });
      }
      const { user, token } = await auth.login(email, password);
      res.cookie('isms_session', token, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/api',
        maxAge: 15 * 60 * 1000
      });
      return res.status(200).json({
        success: true,
        data: user
      });
    } catch (err) {
      next(err);
    }
  });

  router.post('/logout', async (req, res, next) => {
    try {
      await auth.logout(req.cookies?.isms_session);
      res.clearCookie('isms_session', { path: '/api' });
      return res.status(200).json({
        success: true,
        data: { message: 'Logged out successfully' }
      });
    } catch (err) {
      next(err);
    }
  });

  router.get('/me', async (req, res, next) => {
    try {
      const user = await auth.getCurrentUser(req);
      if (!user) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Not authenticated' }
        });
      }
      return res.status(200).json({
        success: true,
        data: user
      });
    } catch (err) {
      next(err);
    }
  });

  router.post('/register', async (req, res) => {
    const { full_name, email } = req.body || {};
    return res.status(201).json({
      success: true,
      data: {
        id: Date.now(),
        full_name: full_name || 'Operator',
        email: email || 'user@example.com',
        role: 'OPERATOR',
        is_active: true
      }
    });
  });

  return router;
}
