import request from 'supertest'
import { app } from '../../src/app'

describe('Authentication API', () => {
  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'demo@urutiq.com',
          password: 'demo123'
        })
        .expect(200)

      expect(response.body).toHaveProperty('token')
      expect(response.body).toHaveProperty('user')
      expect(response.body.user).toHaveProperty('id')
      expect(response.body.user).toHaveProperty('email')
      expect(response.body.user.email).toBe('demo@urutiq.com')
    })

    it('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid@example.com',
          password: 'wrongpassword'
        })
        .expect(401)

      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toBe('Invalid credentials')
    })

    it('should require email and password', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({})
        .expect(400)

      await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com' })
        .expect(400)

      await request(app)
        .post('/api/auth/login')
        .send({ password: 'password123' })
        .expect(400)
    })

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid-email',
          password: 'password123'
        })
        .expect(400)

      expect(response.body).toHaveProperty('error')
    })
  })

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User',
        companyName: 'Test Company'
      }

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201)

      expect(response.body).toHaveProperty('token')
      expect(response.body).toHaveProperty('user')
      expect(response.body.user.email).toBe(userData.email)
      expect(response.body.user.name).toBe(userData.name)
    })

    it('should reject duplicate email', async () => {
      const userData = {
        email: 'demo@urutiq.com', // Already exists
        password: 'password123',
        name: 'Duplicate User',
        companyName: 'Test Company'
      }

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(409)

      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toBe('User already exists')
    })

    it('should require all fields', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({})
        .expect(400)

      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123'
        })
        .expect(400)
    })

    it('should validate password strength', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: '123', // Too short
          name: 'Test User',
          companyName: 'Test Company'
        })
        .expect(400)

      expect(response.body).toHaveProperty('error')
    })
  })

  describe('GET /api/auth/me', () => {
    let authToken: string

    beforeAll(async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'demo@urutiq.com',
          password: 'demo123'
        })
      
      authToken = loginResponse.body.token
    })

    it('should return user info with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toHaveProperty('id')
      expect(response.body).toHaveProperty('email')
      expect(response.body).toHaveProperty('name')
      expect(response.body.email).toBe('demo@urutiq.com')
    })

    it('should reject request without token', async () => {
      await request(app)
        .get('/api/auth/me')
        .expect(401)
    })

    it('should reject request with invalid token', async () => {
      await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401)
    })
  })
})
