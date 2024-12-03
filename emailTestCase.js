const {
  EmailService,
  MockEmailProvider,
  testEmailService,
} = require("./emailService");

// Simple testing framework
class TestRunner {
  constructor() {
    this.totalTests = 0;
    this.passedTests = 0;
  }

  async runTest(name, testFunction) {
    this.totalTests++;
    console.log(`Running test: ${name}`);
    try {
      await testFunction();
      this.passedTests++;
      console.log(`✅ ${name} PASSED\n`);
    } catch (error) {
      console.error(`❌ ${name} FAILED:`, error.message, "\n");
    }
  }

  printSummary() {
    console.log("Test Summary:");
    console.log(`Total Tests: ${this.totalTests}`);
    console.log(`Passed Tests: ${this.passedTests}`);
    console.log(`Failed Tests: ${this.totalTests - this.passedTests}`);
  }
}

// Test Suite
async function runEmailServiceTests() {
  const testRunner = new TestRunner();

  // Test 1: Basic Email Sending
  await testRunner.runTest("Basic Email Sending", async () => {
    const providers = [
      new MockEmailProvider("Provider1"),
      new MockEmailProvider("Provider2"),
    ];
    const emailService = new EmailService(providers);

    const email = {
      to: "test@example.com",
      subject: "Test Email",
      body: "Hello, this is a test.",
    };

    const result = await emailService.send(email);
    if (result.status !== "success") {
      throw new Error("Email sending failed");
    }
  });

  // Test 2: Duplicate Email Prevention
  await testRunner.runTest("Duplicate Email Prevention", async () => {
    const providers = [new MockEmailProvider("Provider1")];
    const emailService = new EmailService(providers);

    const email = {
      to: "duplicate@example.com",
      subject: "Duplicate Test",
      body: "This email should be unique.",
    };

    // First send should work
    await emailService.send(email);

    // Second send should throw an error
    try {
      await emailService.send(email);
      throw new Error("Duplicate email was not prevented");
    } catch (error) {
      if (error.message !== "Duplicate email") {
        throw error;
      }
    }
  });

  // Test 3: Rate Limiting
  await testRunner.runTest("Rate Limiting", async () => {
    const providers = [new MockEmailProvider("Provider1")];
    const emailService = new EmailService(providers, {
      rateLimitPerMinute: 2,
    });

    const email = {
      to: "ratelimit@example.com",
      subject: "Rate Limit Test",
      body: "Testing rate limiting",
    };

    // Send first two emails (should succeed)
    await emailService.send(email);
    await emailService.send({ ...email, subject: "Second Email" });

    // Third email should throw rate limit error
    try {
      await emailService.send({ ...email, subject: "Third Email" });
      throw new Error("Rate limit not enforced");
    } catch (error) {
      if (error.message !== "Rate limit exceeded") {
        throw error;
      }
    }
  });

  // Test 4: Provider Fallback
  await testRunner.runTest("Provider Fallback", async () => {
    const failingProvider = new MockEmailProvider("FailingProvider", 0);
    const workingProvider = new MockEmailProvider("WorkingProvider", 1);

    const emailService = new EmailService([failingProvider, workingProvider]);

    const email = {
      to: "fallback@example.com",
      subject: "Fallback Test",
      body: "Testing provider fallback",
    };

    const result = await emailService.send(email);
    if (result.status !== "success") {
      throw new Error("Provider fallback failed");
    }
  });

  // Print final test summary
  testRunner.printSummary();
}

// Run the tests
runEmailServiceTests().catch(console.error);

// Optional: Run the original test service demo
testEmailService();

module.exports = { runEmailServiceTests };
