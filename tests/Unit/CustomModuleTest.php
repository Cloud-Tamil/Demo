<?php
declare(strict_types=1);

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;
use Company\CustomModule\Model\CustomRepository;

class CustomModuleTest extends TestCase
{
    private CustomRepository $repository;

    protected function setUp(): void
    {
        $this->repository = new CustomRepository();
    }

    public function testGetSystemHealthReturnsExpectedPayload(): void
    {
        $health = $this->repository->getSystemHealth();

        $this->assertIsArray($health);
        $this->assertArrayHasKey('status', $health);
        $this->assertEquals('healthy', $health['status']);
        $this->assertArrayHasKey('version', $health);
        $this->assertEquals('1.0.0', $health['version']);
    }

    public function testProcessItemFormatsString(): void
    {
        $result = $this->repository->processItem(42);
        $this->assertStringContainsString('42', $result);
        $this->assertStringContainsString('Company_CustomModule', $result);
    }
}
