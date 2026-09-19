<?php
declare(strict_types=1);

namespace Company\CustomModule\Model;

use Company\CustomModule\Api\CustomRepositoryInterface;

class CustomRepository implements CustomRepositoryInterface
{
    /**
     * @inheritDoc
     */
    public function getSystemHealth(): array
    {
        return [
            'status' => 'healthy',
            'version' => '1.0.0',
            'timestamp' => date('c'),
            'engine' => 'Magento 2.4.7-p3 Enterprise Architecture'
        ];
    }

    /**
     * @inheritDoc
     */
    public function processItem(int $entityId): string
    {
        return sprintf('Processed entity #%d via Company_CustomModule service layer.', $entityId);
    }
}
