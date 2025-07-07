# Deployment Guide - Muay Thai Check-in System

This guide covers deploying the optimized Muay Thai check-in system to production with all performance and security enhancements.

## Architecture Overview

- **Backend**: FastAPI with PostgreSQL (Railway)
- **Frontend**: React with Vite (Vercel)
- **Caching**: Redis (Railway)
- **Monitoring**: Built-in Prometheus metrics
- **Security**: Rate limiting, CORS, input validation

## Backend Deployment (Railway)

### 1. Prerequisites
- Railway account
- GitHub repository

### 2. Environment Variables
Set these in Railway dashboard:

```env
# Automatically provided by Railway
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
PORT=8000

# Set these manually
ENVIRONMENT=production
ALLOWED_HOSTS=your-backend-domain.railway.app
ALLOWED_ORIGINS=https://your-frontend-domain.vercel.app
LOG_LEVEL=WARNING
RATE_LIMIT_ENABLED=true
```

### 3. Database Setup
Railway will automatically provision PostgreSQL. The database schema will be created on first startup.

### 4. Redis Setup
Add Redis service in Railway dashboard for caching performance.

### 5. Deployment Steps
1. Connect Railway to your GitHub repository
2. Set root directory to `backend/`
3. Railway will auto-detect Python and install dependencies
4. Set environment variables
5. Deploy

### 6. Health Check
Verify deployment: `https://your-backend-domain.railway.app/health`

## Frontend Deployment (Vercel)

### 1. Prerequisites
- Vercel account
- GitHub repository

### 2. Environment Variables
Set in Vercel dashboard:

```env
VITE_API_URL=https://your-backend-domain.railway.app
VITE_ENVIRONMENT=production
```

### 3. Build Configuration
Vercel will automatically detect Vite configuration from `vite.config.ts`.

### 4. Deployment Steps
1. Connect Vercel to your GitHub repository
2. Set root directory to `frontend/`
3. Vercel will auto-detect React/Vite
4. Set environment variables
5. Deploy

### 5. PWA Features
The app includes:
- Service Worker for offline functionality
- App manifest for mobile installation
- Optimized caching strategies

## Performance Optimizations Implemented

### Backend Optimizations

1. **Database Indexing**
   - Indexed frequently queried fields (email, timestamps, member_id)
   - Composite indexes for complex queries
   - Optimized query patterns with joins

2. **Connection Pooling**
   - Pool size: 20 connections
   - Max overflow: 30 connections
   - Connection recycling: 1 hour

3. **Caching Layer**
   - Redis caching for frequent queries
   - TTL-based cache invalidation
   - Background cache updates

4. **Rate Limiting**
   - Per-endpoint rate limits
   - IP-based limiting
   - Configurable limits

5. **Monitoring & Logging**
   - Structured logging with JSON format
   - Prometheus metrics
   - Health check endpoint
   - Request/response logging

### Frontend Optimizations

1. **Code Splitting**
   - Lazy loading of route components
   - Vendor chunk separation
   - Dynamic imports

2. **Caching**
   - Service Worker implementation
   - API response caching
   - Static asset caching

3. **Error Handling**
   - Error boundaries for graceful failures
   - Offline state management
   - User-friendly error messages

4. **Performance**
   - Optimized animations
   - Reduced bundle size
   - PWA capabilities

## Security Enhancements

### Backend Security

1. **CORS Configuration**
   - Restricted origins
   - Specific methods allowed
   - Credential handling

2. **Rate Limiting**
   - Prevents abuse
   - Configurable per endpoint
   - IP-based tracking

3. **Input Validation**
   - Pydantic models
   - Type checking
   - Sanitization

4. **Environment Security**
   - Secure environment variables
   - Production/development separation
   - Secrets management

### Frontend Security

1. **Content Security Policy**
   - Restricted script sources
   - XSS protection
   - Secure defaults

2. **HTTPS Enforcement**
   - Automatic redirects
   - Secure cookies
   - HSTS headers

## Monitoring & Maintenance

### Health Checks
- Backend: `/health` endpoint
- Database connectivity check
- Redis connectivity check
- Version information

### Metrics
- Request count and duration
- Error rates
- Check-in statistics
- Cache hit rates

### Logging
- Structured JSON logs
- Error tracking
- Performance monitoring
- User activity logs

## Scaling Considerations

### Current Capacity
- Handles 100+ concurrent users
- Database optimized for 1000+ members
- Redis caching for performance
- Connection pooling for efficiency

### Scaling Options
1. **Horizontal Scaling**
   - Multiple backend instances
   - Load balancer
   - Database read replicas

2. **Vertical Scaling**
   - Increase server resources
   - Optimize database queries
   - Enhance caching

3. **CDN Integration**
   - Static asset delivery
   - Global edge caching
   - Reduced latency

## Cost Optimization

### Railway (Backend)
- Start with Hobby plan ($5/month)
- Includes PostgreSQL and Redis
- Scale based on usage

### Vercel (Frontend)
- Free tier sufficient for start
- Pro plan if needed ($20/month)
- Includes CDN and analytics

### Estimated Monthly Costs
- **Small gym (50 members)**: $5-10/month
- **Medium gym (100 members)**: $10-25/month
- **Large gym (200+ members)**: $25-50/month

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Check DATABASE_URL format
   - Verify network connectivity
   - Check connection pool settings

2. **Redis Connection Issues**
   - Verify REDIS_URL
   - Check Redis service status
   - Fallback to non-cached operation

3. **Rate Limiting Issues**
   - Adjust rate limits
   - Check IP configuration
   - Monitor usage patterns

4. **CORS Errors**
   - Verify ALLOWED_ORIGINS
   - Check frontend URL
   - Update environment variables

### Performance Issues

1. **Slow Database Queries**
   - Check query execution plans
   - Verify indexes are used
   - Optimize query patterns

2. **Cache Misses**
   - Monitor cache hit rates
   - Adjust TTL values
   - Verify cache keys

3. **High Memory Usage**
   - Check connection pool size
   - Monitor cache size
   - Optimize data structures

## Support & Maintenance

### Regular Tasks
- Monitor error rates
- Check performance metrics
- Update dependencies
- Backup database
- Review logs

### Updates
- Test in development first
- Deploy backend before frontend
- Monitor deployment
- Rollback if issues occur

### Backup Strategy
- Daily database backups
- Configuration backups
- Code repository backups
- Environment variable backups

## Contact & Support

For deployment assistance or issues:
- Check health endpoints
- Review application logs
- Monitor metrics dashboards
- Contact system administrator

---

This deployment guide ensures a robust, scalable, and secure production deployment of the Muay Thai check-in system. 