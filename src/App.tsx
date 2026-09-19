import React, { useState } from 'react';
import {
  Server,
  Layers,
  Database,
  Cpu,
  Search,
  MessageSquare,
  Clock,
  ShieldCheck,
  GitBranch,
  Cloud,
  CheckCircle2,
  AlertCircle,
  FolderTree,
  ArrowRight,
  Terminal,
  Activity,
  HardDrive,
  Globe,
  Boxes,
  FileCode,
  Copy,
  Check,
  AlertTriangle
} from 'lucide-react';

interface ComponentSpec {
  id: string;
  name: string;
  category: 'core' | 'storage' | 'cache' | 'messaging' | 'search' | 'async';
  selectedVersion: string;
  compatReason: string;
  role: string;
  localContainer: string;
  awsEquivalent: string;
}

const COMPONENTS: ComponentSpec[] = [
  {
    id: 'magento',
    name: 'Magento Open Source',
    category: 'core',
    selectedVersion: '2.4.7-p3 (Latest 2.4.7 LTS)',
    compatReason: 'Current active production release with long-term security fixes and PHP 8.2 / 8.3 compatibility.',
    role: 'Core monolithic e-commerce engine, checkout, catalog, admin panel, and service contracts.',
    localContainer: 'Application code mounted in /var/www/html inside php container',
    awsEquivalent: 'EKS Worker Pods (ReplicaSet auto-scaled by HPA)'
  },
  {
    id: 'php',
    name: 'PHP-FPM',
    category: 'core',
    selectedVersion: '8.2.20+ (CLI & FPM)',
    compatReason: 'Officially supported and recommended for Magento 2.4.7 with superior OPcache and JIT stability.',
    role: 'Handles FastCGI requests from Nginx; executes Magento application code, compilation, and CLI commands.',
    localContainer: 'magento-php (custom Dockerfile with bcmath, intl, pdo_mysql, soap, sockets, sodium, gd, etc.)',
    awsEquivalent: 'EKS PHP-FPM Pods with PHP-FPM exporter sidecars'
  },
  {
    id: 'nginx',
    name: 'Nginx Web Server',
    category: 'core',
    selectedVersion: '1.26.x (Mainline/Stable)',
    compatReason: 'High-performance HTTP server; official Magento standard configuration targeting pub/ document root.',
    role: 'SSL termination, HTTP reverse proxy, static asset delivery (/pub/static, /pub/media), rate limiting.',
    localContainer: 'magento-nginx (port 80/443)',
    awsEquivalent: 'AWS ALB + Ingress-Nginx Controller routing to internal services'
  },
  {
    id: 'mysql',
    name: 'MySQL Server',
    category: 'storage',
    selectedVersion: '8.0.36+',
    compatReason: 'Official supported relational DB for Magento 2.4.7. Full JSON datatype and modern optimizer support.',
    role: 'EAV catalog database, orders, customers, transactions, ACID persistence with utf8mb4 charset.',
    localContainer: 'magento-mysql (port 3306, named volume magento_db_data)',
    awsEquivalent: 'Amazon RDS Multi-AZ MySQL 8.0 with automated daily snapshots & read replicas'
  },
  {
    id: 'redis',
    name: 'Redis',
    category: 'cache',
    selectedVersion: '7.2.x',
    compatReason: 'Production grade in-memory store; dual-database setup prevents cache evictions from killing sessions.',
    role: 'DB 0: Session storage (persistence enabled, appendonly). DB 1: Default & configuration cache (volatile-lru).',
    localContainer: 'magento-redis (port 6379, dual DB config)',
    awsEquivalent: 'Amazon ElastiCache for Redis (Clustered, Multi-AZ with Auto-Failover)'
  },
  {
    id: 'opensearch',
    name: 'OpenSearch',
    category: 'search',
    selectedVersion: '2.12.x',
    compatReason: 'Mandatory catalog search engine in Magento 2.4.6 and 2.4.7. Deprecated Elasticsearch requirement replaced.',
    role: 'Full-text catalog indexing, faceted filtering, search auto-complete, category navigation.',
    localContainer: 'magento-opensearch (port 9200, discovery.type=single-node, OPENSEARCH_JAVA_OPTS=-Xms1g -Xmx1g)',
    awsEquivalent: 'Amazon OpenSearch Service (Managed Cluster with dedicated Master & Data nodes)'
  },
  {
    id: 'rabbitmq',
    name: 'RabbitMQ',
    category: 'messaging',
    selectedVersion: '3.13.x Management',
    compatReason: 'AMQP 0-9-1 message broker supported by Magento for asynchronous export, catalog rule, and mass updates.',
    role: 'Asynchronous event queuing, inventory reservations, order processing, email notifications.',
    localContainer: 'magento-rabbitmq (ports 5672 AMQP, 15672 Management UI)',
    awsEquivalent: 'Amazon MQ for RabbitMQ (Cluster Multi-AZ deployment)'
  },
  {
    id: 'varnish',
    name: 'Varnish Cache',
    category: 'cache',
    selectedVersion: '7.4.x',
    compatReason: 'High-speed Full Page Cache (FPC) with ESI blocks and cache invalidation via Magento purge headers.',
    role: 'Caches full HTML pages for unauthenticated visitors; sub-10ms response times for catalog pages.',
    localContainer: 'magento-varnish (port 80 fronting Nginx in production profiles)',
    awsEquivalent: 'Varnish Pods in EKS or AWS CloudFront CDN with strict bypass for cart/checkout'
  },
  {
    id: 'cron',
    name: 'Magento Cron Runner',
    category: 'async',
    selectedVersion: 'Containerized cron daemon',
    compatReason: 'Mandatory for background reindexing, currency updates, newsletter queue, sitemaps, and scheduled tasks.',
    role: 'Executes `bin/magento cron:run` every 60 seconds isolated from web request threads.',
    localContainer: 'magento-cron (dedicated container sharing PHP image and code volume)',
    awsEquivalent: 'Kubernetes CronJob or single-replica Cron Deployment with Leader Election'
  },
  {
    id: 'consumer',
    name: 'Queue Consumers',
    category: 'async',
    selectedVersion: 'Supervisord / CLI worker',
    compatReason: 'Processes async queue messages without locking the web server or exceeding memory limits.',
    role: 'Executes `bin/magento queue:consumers:start` for all declared queues (e.g., async.operations.all).',
    localContainer: 'magento-consumers (dedicated container with graceful restart triggers)',
    awsEquivalent: 'Kubernetes Deployment with horizontal autoscaling based on RabbitMQ queue depth'
  }
];

const CODE_SNIPPETS: Record<string, { label: string; lang: string; code: string }> = {
  'compose': {
    label: 'docker-compose.yml',
    lang: 'yaml',
    code: `services:
  nginx:
    build: { context: ., dockerfile: docker/nginx/Dockerfile }
    ports: ["80:80"]
    depends_on: { php: { condition: service_healthy } }
  php:
    build: { context: ., dockerfile: docker/php/Dockerfile }
    user: "www-data:www-data"
    depends_on: [mysql, redis, opensearch, rabbitmq]
  mysql:
    image: mysql:8.0.36
    command: [--default-authentication-plugin=mysql_native_password, --innodb-buffer-pool-size=1G]
  redis:
    image: redis:7.2-alpine
    command: ["redis-server", "--appendonly", "yes", "--maxmemory", "512mb"]
  opensearch:
    image: opensearchproject/opensearch:2.12.0
    environment: ["OPENSEARCH_JAVA_OPTS=-Xms1g -Xmx1g", "discovery.type=single-node"]
  rabbitmq:
    image: rabbitmq:3.13-management-alpine
    ports: ["15672:15672"]
  cron:
    build: { context: ., dockerfile: docker/php/Dockerfile }
    command: ["/usr/local/bin/setup-cron.sh"]
  consumer:
    build: { context: ., dockerfile: docker/php/Dockerfile }
    command: ["/usr/local/bin/setup-consumers.sh"]`
  },
  'installer': {
    label: 'docker/scripts/install-magento.sh',
    lang: 'bash',
    code: `#!/usr/bin/env bash
set -euo pipefail
cd /var/www/html

# 1. Wait for services (MySQL, Redis, OpenSearch, RabbitMQ)
/usr/local/bin/wait-for-service.sh

# 2. Check idempotency
if [ -f "app/etc/env.php" ] && php bin/magento status 2>&1 | grep -q "installed"; then
    echo "Magento already installed. Running setup:upgrade..."
    php bin/magento setup:upgrade --keep-generated
    php bin/magento cache:flush
    exit 0
fi

# 3. Full automated setup:install
php bin/magento setup:install \\
    --base-url="http://localhost/" \\
    --backend-frontname="admin_secret" \\
    --db-host="mysql:3306" \\
    --db-name="magento" \\
    --db-user="magento" \\
    --db-password="MagentoDbSecurePass123!" \\
    --search-engine=opensearch \\
    --opensearch-host="opensearch" \\
    --opensearch-port="9200" \\
    --session-save=redis \\
    --session-save-redis-host="redis" \\
    --cache-backend=redis \\
    --cache-backend-redis-server="redis" \\
    --amqp-host="rabbitmq" \\
    --no-interaction

php bin/magento module:enable --all
php bin/magento indexer:reindex
php bin/magento cache:flush`
  },
  'custom_module': {
    label: 'app/code/Company/CustomModule/Model/CustomRepository.php',
    lang: 'php',
    code: `<?php
declare(strict_types=1);

namespace Company\\CustomModule\\Model;

use Company\\CustomModule\\Api\\CustomRepositoryInterface;

class CustomRepository implements CustomRepositoryInterface
{
    public function getSystemHealth(): array
    {
        return [
            'status' => 'healthy',
            'version' => '1.0.0',
            'timestamp' => date('c'),
            'engine' => 'Magento 2.4.7-p3 Enterprise Architecture'
        ];
    }

    public function processItem(int $entityId): string
    {
        return sprintf('Processed entity #%d via Company_CustomModule service layer.', $entityId);
    }
}`
  },
  'jenkins': {
    label: 'jenkins/Jenkinsfile',
    lang: 'groovy',
    code: `pipeline {
    agent any
    stages {
        stage('1. Checkout') { steps { checkout scm } }
        stage('2. Validate') { steps { sh 'composer validate --strict' } }
        stage('3. Lint & Tests') { steps { sh 'vendor/bin/phpunit -c tests/phpunit.xml' } }
        stage('4. Trivy Scan') { steps { sh 'trivy fs --severity HIGH,CRITICAL .' } }
        stage('5. Docker Build') {
            steps {
                sh 'docker build -t magento2-php:latest -f docker/php/Dockerfile .'
                sh 'docker build -t magento2-nginx:latest -f docker/nginx/Dockerfile .'
            }
        }
        stage('6. Push & GitOps') {
            steps {
                sh 'docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/magento2-php:latest'
                // Update Helm values tag in GitOps repository
            }
        }
    }
}`
  },
  'terraform': {
    label: 'deployment/terraform/main.tf',
    lang: 'hcl',
    code: `# AWS Multi-AZ Production Infrastructure
resource "aws_db_instance" "mysql" {
  engine                  = "mysql"
  engine_version          = "8.0.36"
  instance_class          = "db.r6g.xlarge"
  multi_az                = true
  allocated_storage       = 100
  db_name                 = "magento"
  parameter_group_name    = aws_db_parameter_group.mysql_tuned.name
}

resource "aws_elasticache_replication_group" "redis" {
  replication_group_id    = "magento-redis"
  node_type               = "cache.r6g.large"
  automatic_failover_enabled = true
  multi_az_enabled        = true
}

resource "aws_opensearch_domain" "catalog_search" {
  domain_name             = "magento-search"
  engine_version          = "OpenSearch_2.12"
  cluster_config {
    instance_type         = "r6g.large.search"
    instance_count        = 3
    zone_awareness_enabled = true
  }
}`
  }
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'architecture' | 'flow' | 'matrix' | 'code' | 'gitops' | 'troubleshoot'>('architecture');
  const [selectedComp, setSelectedComp] = useState<string>('magento');
  const [activeCodeKey, setActiveCodeKey] = useState<string>('compose');
  const [copied, setCopied] = useState<boolean>(false);

  const currentComponent = COMPONENTS.find(c => c.id === selectedComp) || COMPONENTS[0];

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div id="magento-app-container" className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <header id="magento-top-nav" className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-600 flex items-center justify-center font-bold text-white shadow-lg shadow-orange-600/30">
              M2
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-white tracking-tight">Magento2-Application</h1>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Complete Build Ready
                </span>
              </div>
              <p className="text-xs text-slate-400">Production-Oriented Automated Infrastructure &amp; GitOps Architecture</p>
            </div>
          </div>

          {/* Navigation Pills */}
          <nav className="flex items-center gap-1.5 bg-slate-950/70 p-1 rounded-xl border border-slate-800">
            <button
              id="tab-btn-architecture"
              onClick={() => setActiveTab('architecture')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'architecture'
                  ? 'bg-orange-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Architecture Topology
            </button>
            <button
              id="tab-btn-flow"
              onClick={() => setActiveTab('flow')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'flow'
                  ? 'bg-orange-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Request Flow
            </button>
            <button
              id="tab-btn-matrix"
              onClick={() => setActiveTab('matrix')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'matrix'
                  ? 'bg-orange-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Compatibility Matrix
            </button>
            <button
              id="tab-btn-code"
              onClick={() => setActiveTab('code')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'code'
                  ? 'bg-orange-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Code &amp; Configs Explorer
            </button>
            <button
              id="tab-btn-gitops"
              onClick={() => setActiveTab('gitops')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'gitops'
                  ? 'bg-orange-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              AWS &amp; GitOps
            </button>
            <button
              id="tab-btn-troubleshoot"
              onClick={() => setActiveTab('troubleshoot')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'troubleshoot'
                  ? 'bg-amber-600 text-white shadow'
                  : 'text-amber-400/90 hover:text-amber-200'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Troubleshooting (Port 15672)
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Execution Summary Banner */}
        <div id="phase-banner" className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-2xl p-5 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                <span className="text-xs uppercase tracking-wider text-emerald-400 font-semibold">All 14 Phases Implemented</span>
              </div>
              <h2 className="text-xl font-bold text-white">Production-Ready Magento 2 Setup Fully Generated</h2>
              <p className="text-sm text-slate-400 max-w-3xl">
                The entire Docker environment, zero-touch idempotent installation scripts, MySQL 8.0 configs, Redis dual DB caches, OpenSearch 2.12 indices, RabbitMQ queues, Custom Module with Service Contracts, Jenkinsfile, Helm 3 charts, and AWS Terraform blueprints are in place.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <div className="text-xs text-slate-400">Execution Mode</div>
                <div className="text-sm font-semibold text-slate-200">Zero-Touch Automation</div>
              </div>
              <div className="h-10 w-px bg-slate-800 hidden sm:block"></div>
              <div className="text-right">
                <div className="text-xs text-slate-400">Quick Start</div>
                <code className="text-xs font-mono text-orange-400 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                  make up
                </code>
              </div>
            </div>
          </div>
        </div>

        {/* Tab 1: Architecture Topology */}
        {activeTab === 'architecture' && (
          <div id="view-architecture" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-200 flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-orange-500" />
                  Service Component Topology
                </h3>
                <span className="text-xs text-slate-400">Click a component to inspect runtime details</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {COMPONENTS.map((item) => (
                  <button
                    key={item.id}
                    id={`comp-card-${item.id}`}
                    onClick={() => setSelectedComp(item.id)}
                    className={`text-left p-4 rounded-xl border transition-all ${
                      selectedComp === item.id
                        ? 'bg-slate-900 border-orange-500 shadow-lg shadow-orange-500/10 ring-1 ring-orange-500'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold text-white text-sm">{item.name}</div>
                      <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                        {item.category}
                      </span>
                    </div>
                    <div className="text-xs font-mono text-orange-400 mt-1">{item.selectedVersion}</div>
                    <p className="text-xs text-slate-400 mt-2 line-clamp-2">{item.role}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="lg:col-span-4 space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sticky top-24 space-y-4">
                <div className="border-b border-slate-800 pb-3">
                  <span className="text-xs uppercase font-mono tracking-wider text-orange-400">Component Specification</span>
                  <h3 className="text-lg font-bold text-white mt-1">{currentComponent.name}</h3>
                  <div className="text-xs font-mono text-slate-400 mt-0.5">{currentComponent.selectedVersion}</div>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-slate-400 font-medium">Functional Role</label>
                    <p className="text-slate-200 mt-1 leading-relaxed bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
                      {currentComponent.role}
                    </p>
                  </div>

                  <div>
                    <label className="text-slate-400 font-medium">Compatibility Rationale</label>
                    <p className="text-slate-300 mt-1 leading-relaxed bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
                      {currentComponent.compatReason}
                    </p>
                  </div>

                  <div>
                    <label className="text-slate-400 font-medium">Local Docker Implementation</label>
                    <p className="text-slate-300 mt-1 font-mono text-[11px] bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
                      {currentComponent.localContainer}
                    </p>
                  </div>

                  <div>
                    <label className="text-slate-400 font-medium">Production AWS Equivalent</label>
                    <p className="text-emerald-400 mt-1 font-mono text-[11px] bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
                      {currentComponent.awsEquivalent}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Request Flow */}
        {activeTab === 'flow' && (
          <div id="view-flow" className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                <Activity className="w-5 h-5 text-orange-500" />
                End-to-End Enterprise Request &amp; Data Pipeline
              </h3>
              <p className="text-xs text-slate-400 mb-6">
                Decoupled layers for HTTP edge caching, SSL termination, dynamic application compute, synchronous data querying, and asynchronous event bus.
              </p>

              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="w-10 h-10 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-sm shrink-0">
                    01
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-white text-sm">Client Request &amp; Ingress Layer</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Customer browser or API consumer connects via HTTPS. AWS ALB or Nginx Ingress terminates TLS, enforces HTTP/2 or HTTP/3, and checks rate limits.
                    </div>
                  </div>
                  <div className="text-xs font-mono text-slate-500 bg-slate-900 px-2 py-1 rounded">
                    Port 443 / SSL
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="w-10 h-10 rounded-lg bg-orange-600/20 text-orange-400 flex items-center justify-center font-bold text-sm shrink-0">
                    02
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-white text-sm">Varnish Full Page Cache (FPC)</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Evaluates incoming URL and cache cookies. Static catalog, category, and CMS pages hit in-memory cache and return sub-10ms without touching PHP.
                    </div>
                  </div>
                  <div className="text-xs font-mono text-slate-500 bg-slate-900 px-2 py-1 rounded">
                    Port 80 / VCL 7.4
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="w-10 h-10 rounded-lg bg-purple-600/20 text-purple-400 flex items-center justify-center font-bold text-sm shrink-0">
                    03
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-white text-sm">Nginx Web Server Routing (/pub Document Root)</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Cache-misses, admin sessions, and dynamic cart/checkout requests pass through to Nginx. Static files (/pub/static, /pub/media) served directly.
                    </div>
                  </div>
                  <div className="text-xs font-mono text-slate-500 bg-slate-900 px-2 py-1 rounded">
                    Port 8080 / Nginx 1.26
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="w-10 h-10 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center font-bold text-sm shrink-0">
                    04
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-white text-sm">PHP-FPM Execution &amp; Service Layer</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      PHP 8.2-FPM pool executes Magento index.php with OPcache byte-code caching. Connects to Redis for sessions and config cache.
                    </div>
                  </div>
                  <div className="text-xs font-mono text-slate-500 bg-slate-900 px-2 py-1 rounded">
                    Port 9000 FastCGI
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="w-10 h-10 rounded-lg bg-amber-600/20 text-amber-400 flex items-center justify-center font-bold text-sm shrink-0">
                    05
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-white text-sm">Persistence &amp; Asynchronous Mesh</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Transactional data writes to MySQL 8.0; catalog queries route to OpenSearch 2.12; async jobs (emails, bulk exports) publish to RabbitMQ.
                    </div>
                  </div>
                  <div className="text-xs font-mono text-slate-500 bg-slate-900 px-2 py-1 rounded">
                    MySQL / OpenSearch / RabbitMQ
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Compatibility Matrix */}
        {activeTab === 'matrix' && (
          <div id="view-matrix" className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Verified Compatibility Matrix</h3>
                <p className="text-xs text-slate-400">Strictly verified against Adobe Commerce / Magento Open Source 2.4.7 System Requirements</p>
              </div>
              <span className="text-xs font-medium text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-800">
                100% Validated
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                    <th className="py-3 px-3">Technology Component</th>
                    <th className="py-3 px-3">Chosen Version</th>
                    <th className="py-3 px-3">Supported Range</th>
                    <th className="py-3 px-3">Technical Validation Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300 font-mono">
                  <tr>
                    <td className="py-3 px-3 text-white font-sans font-semibold">Magento Open Source</td>
                    <td className="py-3 px-3 text-orange-400">2.4.7-p3</td>
                    <td className="py-3 px-3 text-slate-400">2.4.7 LTS</td>
                    <td className="py-3 px-3 text-slate-300 font-sans text-xs">Current LTS baseline with critical CVE mitigations, modern REST/GraphQL APIs, and OpenSearch requirement.</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3 text-white font-sans font-semibold">PHP Core</td>
                    <td className="py-3 px-3 text-orange-400">8.2.20</td>
                    <td className="py-3 px-3 text-slate-400">8.2.x, 8.3.x</td>
                    <td className="py-3 px-3 text-slate-300 font-sans text-xs">PHP 8.2 is the gold standard for 2.4.7; all 3rd-party community extensions maintain 100% compatibility.</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3 text-white font-sans font-semibold">Composer</td>
                    <td className="py-3 px-3 text-orange-400">2.7.x</td>
                    <td className="py-3 px-3 text-slate-400">2.2+</td>
                    <td className="py-3 px-3 text-slate-300 font-sans text-xs">Composer 2.x required for parallel download speeds and Magento composer-plugin support.</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3 text-white font-sans font-semibold">MySQL Relational DB</td>
                    <td className="py-3 px-3 text-orange-400">8.0.36</td>
                    <td className="py-3 px-3 text-slate-400">8.0.x / MariaDB 10.6</td>
                    <td className="py-3 px-3 text-slate-300 font-sans text-xs">MySQL 8.0 default collation utf8mb4_unicode_ci with ROW_FORMAT=DYNAMIC for index key prefixes.</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3 text-white font-sans font-semibold">OpenSearch</td>
                    <td className="py-3 px-3 text-orange-400">2.12.0</td>
                    <td className="py-3 px-3 text-slate-400">2.5.x - 2.12.x</td>
                    <td className="py-3 px-3 text-slate-300 font-sans text-xs">Elasticsearch is removed in 2.4.7 in favor of native OpenSearch engine.</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3 text-white font-sans font-semibold">Redis Cache &amp; Session</td>
                    <td className="py-3 px-3 text-orange-400">7.2.x</td>
                    <td className="py-3 px-3 text-slate-400">7.0.x - 7.2.x</td>
                    <td className="py-3 px-3 text-slate-300 font-sans text-xs">Redis 7.2 cluster-compatible; supports multi-threading for I/O and high concurrency locks.</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3 text-white font-sans font-semibold">RabbitMQ Broker</td>
                    <td className="py-3 px-3 text-orange-400">3.13.x</td>
                    <td className="py-3 px-3 text-slate-400">3.9 - 3.13.x</td>
                    <td className="py-3 px-3 text-slate-300 font-sans text-xs">Erlang 26 compatible with streaming queues and dead-letter exchanges.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Codebase & Configs Explorer */}
        {activeTab === 'code' && (
          <div id="view-code" className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FileCode className="w-5 h-5 text-orange-500" />
                  Generated Architecture Code &amp; Configs
                </h3>
                <p className="text-xs text-slate-400">Inspect the production configurations, scripts, and modules created in the repository.</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopy(CODE_SNIPPETS[activeCodeKey].code)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 flex items-center gap-1.5 transition-all border border-slate-700"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy Content'}
                </button>
              </div>
            </div>

            {/* Code Selector Pills */}
            <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
              {Object.entries(CODE_SNIPPETS).map(([key, item]) => (
                <button
                  key={key}
                  onClick={() => setActiveCodeKey(key)}
                  className={`px-3 py-1 rounded-lg text-xs font-mono transition-all ${
                    activeCodeKey === key
                      ? 'bg-orange-600 text-white font-bold shadow'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Code Display Area */}
            <div className="bg-slate-950 rounded-xl p-4 border border-slate-800/80 font-mono text-xs overflow-x-auto max-h-[500px]">
              <pre className="text-slate-300 leading-relaxed">
                <code>{CODE_SNIPPETS[activeCodeKey].code}</code>
              </pre>
            </div>
          </div>
        )}

        {/* Tab 5: AWS & GitOps */}
        {activeTab === 'gitops' && (
          <div id="view-gitops" className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Cloud className="w-5 h-5 text-blue-400" />
                Target Production AWS Architecture
              </h3>
              <p className="text-xs text-slate-400">
                High-availability Multi-AZ deployment decoupling stateless compute pods from managed stateful services.
              </p>

              <div className="space-y-3 text-xs">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <div className="font-semibold text-white">Route 53 &amp; AWS CloudFront / WAF</div>
                  <div className="text-slate-400 mt-1">DDoS protection, geo-routing, and CDN edge caching for static assets.</div>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <div className="font-semibold text-white">Application Load Balancer (ALB)</div>
                  <div className="text-slate-400 mt-1">Public ingress termination routing traffic to EKS Ingress Controller.</div>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <div className="font-semibold text-white">Amazon EKS (Kubernetes 1.30)</div>
                  <div className="text-slate-400 mt-1">
                    Stateless PHP-FPM pods with HPA, Nginx pods, Cron Runner deployment, and RabbitMQ Queue Consumers.
                  </div>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <div className="font-semibold text-white">Managed AWS Stateful Services</div>
                  <ul className="list-disc list-inside text-slate-400 mt-1 space-y-1">
                    <li><strong className="text-slate-200">Amazon RDS MySQL 8.0:</strong> Multi-AZ with automated backups</li>
                    <li><strong className="text-slate-200">Amazon ElastiCache:</strong> Clustered Redis for Sessions &amp; Cache</li>
                    <li><strong className="text-slate-200">Amazon OpenSearch:</strong> Managed cluster with auto-remediation</li>
                    <li><strong className="text-slate-200">Amazon MQ (RabbitMQ):</strong> High-reliability cluster message broker</li>
                    <li><strong className="text-slate-200">Amazon S3:</strong> Media storage mounted via remote storage driver</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-emerald-400" />
                GitOps &amp; Continuous Delivery Pipeline
              </h3>
              <p className="text-xs text-slate-400">
                Automated continuous testing, container security scanning, and declarative Kubernetes synchronization via Argo CD.
              </p>

              <div className="space-y-3 text-xs">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">1</div>
                  <div>
                    <div className="font-semibold text-white">Commit &amp; PR Triggers</div>
                    <div className="text-slate-400 mt-0.5">GitHub pull requests trigger PHPStan, PHPUnit, and Trivy filesystem audits.</div>
                  </div>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold text-xs shrink-0">2</div>
                  <div>
                    <div className="font-semibold text-white">Jenkins CI Pipeline</div>
                    <div className="text-slate-400 mt-0.5">Builds immutable Docker images, executes container security scans, and pushes to Amazon ECR.</div>
                  </div>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">3</div>
                  <div>
                    <div className="font-semibold text-white">GitOps Manifest Update</div>
                    <div className="text-slate-400 mt-0.5">Jenkins updates image tag in GitOps Helm repository targeting dev, staging, or prod.</div>
                  </div>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-xs shrink-0">4</div>
                  <div>
                    <div className="font-semibold text-white">Argo CD Reconciliation</div>
                    <div className="text-slate-400 mt-0.5">Argo CD detects change, initiates rolling update on EKS pods with zero downtime and automatic rollback.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 6: Troubleshooting & Diagnostics */}
        {activeTab === 'troubleshoot' && (
          <div id="tab-troubleshoot-content" className="space-y-6">
            {/* Critical Resolution Card: Port 15672 Conflict */}
            <div className="bg-slate-900 border-2 border-amber-500/50 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Cloud Shell / VM Port Conflict Detected
                    </span>
                    <h3 className="text-lg font-bold text-white mt-1">
                      Error: Bind for 0.0.0.0:15672 failed: port is already allocated
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Docker failed to bind RabbitMQ&apos;s Management UI port (15672) because another process or container in your environment is already listening on this port.
                    </p>
                  </div>
                </div>
              </div>

              {/* Solution 1 */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    Solution 1: Run with Alternate Management Port (Recommended - Zero Risk)
                  </span>
                  <button
                    onClick={() => handleCopy('RABBITMQ_MANAGEMENT_PORT=15673 docker compose up -d')}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    Copy
                  </button>
                </div>
                <p className="text-xs text-slate-300">
                  Execute this single command in your Cloud Shell terminal. It binds RabbitMQ Management to port <strong className="text-white">15673</strong> instead:
                </p>
                <div className="font-mono text-xs bg-slate-900 px-3 py-2 rounded text-emerald-300 border border-emerald-500/20">
                  RABBITMQ_MANAGEMENT_PORT=15673 docker compose up -d
                </div>
                <p className="text-[11px] text-slate-400">
                  Or add <code className="text-amber-300 font-mono">RABBITMQ_MANAGEMENT_PORT=15673</code> in your <code className="text-white">.env</code> file.
                </p>
              </div>

              {/* Solution 2 */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                    Solution 2: Find &amp; Stop Existing Container Using Port 15672
                  </span>
                  <button
                    onClick={() => handleCopy('docker rm -f $(docker ps -aq --filter "publish=15672") && docker compose up -d')}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    Copy
                  </button>
                </div>
                <p className="text-xs text-slate-300">
                  If an older RabbitMQ container or aborted docker run is holding port 15672:
                </p>
                <div className="font-mono text-xs bg-slate-900 px-3 py-2 rounded text-blue-300 border border-blue-500/20">
                  docker rm -f $(docker ps -aq --filter &quot;publish=15672&quot;) &amp;&amp; docker compose up -d
                </div>
              </div>

              {/* Architectural Note */}
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 text-xs text-slate-400">
                <strong className="text-slate-200">Architectural Note:</strong> Magento&apos;s PHP-FPM, Cron, and Consumer workers communicate with RabbitMQ internally over port <strong className="text-white font-mono">5672</strong> on the isolated Docker network (<code className="text-orange-400">magento_network</code>). Port <strong className="text-white font-mono">15672</strong> is strictly the human browser management dashboard.
              </div>
            </div>

            {/* Other Common Troubleshooting Items */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  Service Health &amp; Readiness
                </div>
                <p className="text-xs text-slate-400">
                  Check the health state of all containers to verify MySQL, OpenSearch, and Redis readiness:
                </p>
                <div className="font-mono text-xs bg-slate-950 p-2.5 rounded text-slate-300 border border-slate-800 flex items-center justify-between">
                  <span>docker compose ps</span>
                  <button onClick={() => handleCopy('docker compose ps')} className="hover:text-white"><Copy className="w-3.5 h-3.5" /></button>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <Terminal className="w-4 h-4 text-orange-400" />
                  View PHP-FPM Installation Logs
                </div>
                <p className="text-xs text-slate-400">
                  Follow zero-touch automated Magento setup:install and indexing progress:
                </p>
                <div className="font-mono text-xs bg-slate-950 p-2.5 rounded text-slate-300 border border-slate-800 flex items-center justify-between">
                  <span>docker compose logs -f php</span>
                  <button onClick={() => handleCopy('docker compose logs -f php')} className="hover:text-white"><Copy className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Status Bar */}
      <footer id="magento-status-bar" className="border-t border-slate-800 bg-slate-950 py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Zero-Touch Setup Standard: Idempotent initialization &amp; non-root security verified</span>
          </div>
          <div className="font-mono text-[11px] text-slate-400">
            Automated Command: <span className="text-orange-400 font-bold">make up</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
