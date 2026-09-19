# ==============================================================================
# Magento 2 Automated Makefile
# High-craft developer workflow for zero-touch setup, maintenance, & deployment
# ==============================================================================

SHELL := /bin/bash
.DEFAULT_GOAL := help

# Environment files
ENV_FILE ?= .env

-include $(ENV_FILE)
export

.PHONY: help env build up down restart logs shell status cache-clean cache-flush \
	reindex compile static-deploy upgrade install sample-data test scan clean

help: ## Show this help menu
	@echo "=================================================================="
	@echo "   Magento 2 Production-Grade Application Automation CLI"
	@echo "=================================================================="
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

env: ## Copy .env.example to .env if not exists
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo -e "\033[32mCreated .env from .env.example\033[0m"; \
	else \
		echo -e "\033[33m.env already exists\033[0m"; \
	fi

build: ## Build all Docker containers
	docker compose build --parallel

up: env ## Start all infrastructure & application containers in background
	docker compose up -d

down: ## Stop and remove all running containers
	docker compose down

restart: down up ## Restart all containers

logs: ## Tail real-time logs from all services
	docker compose logs -f

logs-php: ## Tail PHP-FPM application logs
	docker compose logs -f php

logs-nginx: ## Tail Nginx web server logs
	docker compose logs -f nginx

logs-cron: ## Tail cron runner logs
	docker compose logs -f cron

logs-consumer: ## Tail queue consumer logs
	docker compose logs -f consumer

shell: ## Open interactive bash shell inside PHP container
	docker compose exec -u www-data php bash

status: ## Inspect container health and Magento status
	docker compose ps
	@echo ""
	@docker compose exec php bin/magento status || true

install: env ## Run automated zero-touch Magento installation
	docker compose exec php /usr/local/bin/install-magento.sh

cache-clean: ## Clean Magento cache types
	docker compose exec php bin/magento cache:clean

cache-flush: ## Flush all Magento cache types
	docker compose exec php bin/magento cache:flush

reindex: ## Trigger full asynchronous reindexing
	docker compose exec php bin/magento indexer:reindex

compile: ## Run DI compilation
	docker compose exec php bin/magento setup:di:compile

static-deploy: ## Deploy frontend static content
	docker compose exec php bin/magento setup:static-content:deploy -f

upgrade: ## Run database schema and data upgrades
	docker compose exec php bin/magento setup:upgrade

sample-data: ## Deploy Magento official sample catalog data
	docker compose exec php bin/magento sampledata:deploy
	docker compose exec php bin/magento setup:upgrade

test: ## Execute PHPUnit tests
	docker compose exec php vendor/bin/phpunit -c tests/phpunit.xml

scan: ## Run Trivy vulnerability scans on filesystem and images
	trivy fs --severity HIGH,CRITICAL .
	trivy image magento2-application-php:latest || true

clean: ## Danger: Tear down containers and destroy persistent volumes
	@read -p "Are you sure you want to destroy all data volumes? (y/N): " confirm && \
	if [ "$$confirm" = "y" ]; then \
		docker compose down -v --remove-orphans; \
		echo -e "\033[31mVolumes destroyed.\033[0m"; \
	fi
