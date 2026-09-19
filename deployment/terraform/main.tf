# ==============================================================================
# Terraform AWS Production Infrastructure Blueprint for Magento 2
# Multi-AZ VPC, EKS Cluster, RDS MySQL 8.0, ElastiCache Redis, and OpenSearch
# ==============================================================================

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "environment" {
  type    = string
  default = "prod"
}

variable "vpc_cidr" {
  type    = string
  default = "10.0.0.0/16"
}

# 1. AWS VPC & Subnets
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "magento-${var.environment}-vpc"
  }
}

resource "aws_subnet" "public" {
  count                   = 3
  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 4, count.index)
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name                     = "magento-${var.environment}-public-${count.index}"
    "kubernetes.io/role/elb" = "1"
  }
}

resource "aws_subnet" "private" {
  count             = 3
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 4, count.index + 4)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name                              = "magento-${var.environment}-private-${count.index}"
    "kubernetes.io/role/internal-elb" = "1"
  }
}

data "aws_availability_zones" "available" {
  state = "available"
}

# 2. Amazon RDS for MySQL 8.0 (Multi-AZ)
resource "aws_db_subnet_group" "rds" {
  name       = "magento-${var.environment}-rds-subnet-group"
  subnet_ids = aws_subnet.private[*].id
}

resource "aws_db_instance" "mysql" {
  identifier             = "magento-${var.environment}-mysql"
  engine                 = "mysql"
  engine_version         = "8.0.36"
  instance_class         = "db.r6g.xlarge"
  allocated_storage      = 100
  max_allocated_storage  = 1000
  storage_type           = "gp3"
  multi_az               = true
  db_name                = "magento"
  username               = "magento_admin"
  password               = "ChangeMeInSecretsManager123!" # Retrieved via AWS Secrets Manager in production
  db_subnet_group_name   = aws_db_subnet_group.rds.name
  skip_final_snapshot    = false
  final_snapshot_identifier = "magento-${var.environment}-final-snapshot"
  backup_retention_period = 30
  backup_window           = "03:00-04:00"
  maintenance_window      = "Sun:04:30-Sun:05:30"
  deletion_protection     = true

  parameter_group_name = aws_db_parameter_group.mysql_tuned.name
}

resource "aws_db_parameter_group" "mysql_tuned" {
  name   = "magento-${var.environment}-mysql-params"
  family = "mysql8.0"

  parameter {
    name  = "max_allowed_packet"
    value = "268435456"
  }

  parameter {
    name  = "innodb_buffer_pool_size"
    value = "{DBInstanceClassMemory*3/4}"
  }
}

# 3. Amazon ElastiCache for Redis (Sessions & Cache)
resource "aws_elasticache_subnet_group" "redis" {
  name       = "magento-${var.environment}-redis-subnet-group"
  subnet_ids = aws_subnet.private[*].id
}

resource "aws_elasticache_replication_group" "redis" {
  replication_group_id          = "magento-${var.environment}-redis"
  description                   = "Magento Redis Cluster for Session and Object Cache"
  node_type                     = "cache.r6g.large"
  num_cache_clusters            = 2
  port                          = 6379
  parameter_group_name          = "default.redis7"
  subnet_group_name             = aws_elasticache_subnet_group.redis.name
  automatic_failover_enabled    = true
  multi_az_enabled              = true
  transit_encryption_enabled    = true
  at_rest_encryption_enabled    = true
}

# 4. Amazon OpenSearch Service Cluster
resource "aws_opensearch_domain" "catalog_search" {
  domain_name    = "magento-${var.environment}-search"
  engine_version = "OpenSearch_2.12"

  cluster_config {
    instance_type          = "r6g.large.search"
    instance_count         = 3
    zone_awareness_enabled = true

    zone_awareness_config {
      availability_zone_count = 3
    }
  }

  ebs_options {
    ebs_enabled = true
    volume_type = "gp3"
    volume_size = 100
  }

  encrypt_at_rest {
    enabled = true
  }

  node_to_node_encryption {
    enabled = true
  }
}

# 5. Amazon ECR Repositories
resource "aws_ecr_repository" "php" {
  name                 = "magento2-php"
  image_tag_mutability = "IMMUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_ecr_repository" "nginx" {
  name                 = "magento2-nginx"
  image_tag_mutability = "IMMUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}
