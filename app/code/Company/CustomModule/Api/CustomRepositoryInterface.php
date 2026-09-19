<?php
declare(strict_types=1);

namespace Company\CustomModule\Api;

/**
 * Service Contract Interface for Custom Business Logic
 */
interface CustomRepositoryInterface
{
    /**
     * Retrieve system diagnostics payload
     *
     * @return array<string, mixed>
     */
    public function getSystemHealth(): array;

    /**
     * Process custom catalog enrichment
     *
     * @param int $entityId
     * @return string
     */
    public function processItem(int $entityId): string;
}
