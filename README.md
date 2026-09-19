# Magento2-Application: Production-Grade Automated E-Commerce Platform

A production-ready, automated, zero-touch infrastructure and application codebase for **Magento Open Source 2.4.7-p3**, featuring Docker, Nginx, PHP 8.2-FPM, MySQL 8.0, Redis 7.2, OpenSearch 2.12, RabbitMQ 3.13, Varnish 7.4, Jenkins CI/CD, Helm 3, Terraform AWS, and Argo CD GitOps.

---

## 1. Project Overview & Features

* **Zero-Touch Automated Installation**: A single `docker compose up -d` checks dependencies, provisions storage, runs `setup:install` idempotently, generates `env.php`, and configures caches.
* **Separation of Concerns**: Isolated containers for Nginx, PHP-FPM, MySQL, Redis (Dual DBs), OpenSearch, RabbitMQ, Cron runner, and Queue consumer supervisors.
* **Enterprise Security**: 100% non-root containers (`www-data:www-data`), minimal Alpine/Bookworm base images, Trivy vulnerability scanning, and strict file permissions.
* **Production-Validated Custom Module**: Included `Company_CustomModule` demonstrating Service Contracts, PSR-4/PSR-12 conformance, and ObjectManager Dependency Injection.
* **Cloud & GitOps Native**: Ready-to-deploy Helm chart, Terraform AWS infrastructure (VPC, RDS Multi-AZ, ElastiCache, OpenSearch), and Argo CD continuous delivery manifests.

---

## 2. Architecture & Request Flow

```text
                                Internet
                                   |
                                   v
             [ Route 53 (DNS) / CloudFront CDN + WAF ]
                                   |
                                   v
             [ AWS Application Load Balancer (ALB) ]
                                   |
                                   v
              +--------------------+--------------------+
              |                                         |
     (Static / Media / Public)                (Dynamic / Admin / API)
              |                                         |
              v                                         v
   [ Nginx Edge / Ingress ]                 [ Varnish 7.4 (FPC) ]
              |                                         |
              | (FastCGI :9000)                         | (Cache Miss / Pass)
              +--------------------+--------------------+
                                   |
                                   v
                    [ Magento PHP-FPM 8.2 Pods ]
                   (Horizontal Pod Autoscaler - HPA)
                                   |
         +-----------------+-------+-------+-----------------+
         |                 |               |                 |
         v                 v               v                 v
   [ Amazon RDS ]   [ ElastiCache ]  [ Amazon OpenSearch ] [ Amazon MQ ]
    MySQL 8.0          Redis 7.2         Cluster 2.12        RabbitMQ
    (Multi-AZ)       (DB0: Session     (Catalog Index      (AMQP Async
                     DB1: Cache)         & Search)           Events)
         ^                                                   ^
         |                                                   |
         +-------------------------+-------------------------+
                                   |
                 +-----------------+-----------------+
                 |                                   |
                 v                                   v
       [ Magento Cron Runner ]            [ Queue Consumers ]
        (Scheduled Tasks:                 (Supervisord / CLI
         cron:run every 60s)               Consumers: async.*)
```

---

## 3. Technology & Version Matrix

| Technology | Selected Version | Compatibility Rationale |
| :--- | :--- | :--- |
| **Magento Open Source** | `2.4.7-p3` | Active LTS baseline with critical CVE mitigations and native OpenSearch support. |
| **PHP** | `8.2.20` | Gold standard for Magento 2.4.7 with OPcache, JIT, and full module stability. |
| **Composer** | `2.7.x` | Required for parallel dependency resolution and Magento root update plugins. |
| **MySQL** | `8.0.36` | Relational engine with `ROW_FORMAT=DYNAMIC` and utf8mb4 collation support. |
| **OpenSearch** | `2.12.0` | Mandated search engine replacing deprecated Elasticsearch. |
| **Redis** | `7.2.4` | In-memory session (DB 0) and configuration/block cache (DB 1). |
| **RabbitMQ** | `3.13.2` | High-reliability AMQP broker for async processing. |
| **Nginx** | `1.26-alpine` | High-throughput web server serving `/pub` document root. |
| **Varnish** | `7.4.2` | In-memory Full Page Cache (FPC) with ESI and tag-based invalidation. |

---

## 4. Local Quickstart (Zero Manual Intervention)

```bash
# 1. Clone repository
git clone https://github.com/company/Magento2-Application.git
cd Magento2-Application

# 2. Copy environment template
cp .env.example .env

# 3. Build & start all services
make build
make up

# 4. View automated initialization logs
make logs-php

# 5. Check cluster status
make status
```

Storefront URL: `http://localhost/`  
Admin Panel URL: `http://localhost/admin_secret` (User: `admin` / Password: `AdminSecurePassword123!`)

---

## 5. Makefile Commands

```bash
make help            # Display list of available targets
make up              # Start all Docker containers
make down            # Stop all running containers
make restart         # Restart containers
make logs            # Tail all container logs
make shell           # Open interactive bash in PHP container as www-data
make cache-clean     # Clean Magento cache
make cache-flush     # Flush all Magento caches
make reindex         # Trigger catalog reindex
make compile         # Execute DI compilation
make static-deploy   # Deploy frontend static assets
make upgrade         # Run database schema/data upgrades
make sample-data     # Deploy Magento sample product catalog
make test            # Run PHPUnit unit tests
make scan            # Run Trivy security vulnerability scans
make clean           # Destroy containers and named persistent volumes
```

---

## 6. Testing & Security

* **Unit Testing**: Run `make test` or `docker compose exec php vendor/bin/phpunit -c tests/phpunit.xml`.
* **Vulnerability Scanning**: Run `make scan` to trigger Trivy scanning across the codebase and container images.
* **Non-Root Execution**: Both PHP-FPM and Nginx run under dedicated non-root users (`www-data`, UID 33/1000).

---

## 7. Cloud Deployment (AWS + Terraform + EKS + Argo CD)

1. **Terraform**: Navigate to `deployment/terraform/` and run `terraform init && terraform apply` to provision the VPC, RDS MySQL Multi-AZ, ElastiCache Redis, OpenSearch Cluster, and ECR repositories.
2. **Helm**: Deploy application charts using `helm upgrade --install magento deployment/helm/magento -f deployment/helm/magento/values-prod.yaml`.
3. **Argo CD**: Apply `deployment/argocd/application-prod.yaml` to enable continuous GitOps reconciliation and automated rolling updates.

---

## 8. Troubleshooting Guide

| Issue | Root Cause | Resolution |
| :--- | :--- | :--- |
| **502 Bad Gateway** | PHP-FPM container starting or crashed | Check `make logs-php`. Verify memory limits and OPcache buffer. |
| **Database Connection Refused** | MySQL not yet ready on port 3306 | `wait-for-service.sh` automatically polls until ready. Run `docker compose ps mysql`. |
| **Catalog Search Unavailable** | OpenSearch cluster status red | Verify `OPENSEARCH_JAVA_OPTS=-Xms1g -Xmx1g` and host virtual memory `sysctl -w vm.max_map_count=262144`. |
| **Bind for 0.0.0.0:15672 failed: port is already allocated** | Port 15672 in use on host or Cloud Shell | Change in `.env`: `RABBITMQ_MANAGEMENT_PORT=15673` or free the port: `docker rm -f $(docker ps -q --filter "publish=15672")`. |
| **Permission Denied in var/ or pub/** | Container user UID mismatch | Run `chown -R www-data:www-data var generated pub/static pub/media`. |
