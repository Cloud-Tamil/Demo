<?php
declare(strict_types=1);

namespace Company\CustomModule\Controller\Index;

use Magento\Framework\App\Action\HttpGetActionInterface;
use Magento\Framework\Controller\Result\JsonFactory;
use Company\CustomModule\Api\CustomRepositoryInterface;

class Index implements HttpGetActionInterface
{
    private JsonFactory $jsonFactory;
    private CustomRepositoryInterface $customRepository;

    public function __construct(
        JsonFactory $jsonFactory,
        CustomRepositoryInterface $customRepository
    ) {
        $this->jsonFactory = $jsonFactory;
        $this->customRepository = $customRepository;
    }

    public function execute()
    {
        $result = $this->jsonFactory->create();
        $health = $this->customRepository->getSystemHealth();
        
        return $result->setData([
            'status' => 'success',
            'data' => $health,
            'message' => 'Company_CustomModule controller executed successfully.'
        ]);
    }
}
