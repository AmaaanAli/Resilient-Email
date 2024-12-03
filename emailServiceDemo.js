const { EmailService, MockEmailProvider } = require("./emailService");

class AdvancedMockEmailProvider extends MockEmailProvider {
  constructor(name, successRate, additionalDelay = 0) {
    super(name, successRate);
    this.additionalDelay = additionalDelay;
  }

  async send(email) {
    // Simulate network delay
    await new Promise((resolve) =>
      setTimeout(resolve, 100 + this.additionalDelay)
    );
    return super.send(email);
  }
}

async function demonstrateEmailService() {
  // Create providers with different characteristics
  const providers = [
    new AdvancedMockEmailProvider("FastProvider", 0.7),
    new AdvancedMockEmailProvider("SlowProvider", 0.4, 500),
  ];

  // Configure email service with custom settings
  const emailService = new EmailService(providers, {
    maxRetries: 3,
    baseDelay: 500,
    rateLimitPerMinute: 5,
  });

  // Demonstration scenarios
  const scenarios = [
    // Scenario 1: Successful email send
    {
      description: "Successful Email Send",
      email: {
        to: "success@example.com",
        subject: "First Email",
        body: "This is a successful email test",
      },
    },
    // Scenario 2: Duplicate email prevention
    {
      description: "Duplicate Email Prevention",
      email: {
        to: "duplicate@example.com",
        subject: "Duplicate Email",
        body: "This email should be blocked",
      },
    },
    // Scenario 3: Rate limit testing
    {
      description: "Rate Limit Testing",
      emails: Array(6)
        .fill()
        .map((_, i) => ({
          to: `ratelimit${i}@example.com`,
          subject: `Rate Limit Email ${i}`,
          body: "Testing rate limiting",
        })),
    },
  ];

  // Run demonstration scenarios
  for (const scenario of scenarios) {
    console.log(`\n--- ${scenario.description} ---`);

    if (scenario.emails) {
      // Rate limit scenario
      for (const email of scenario.emails) {
        try {
          const result = await emailService.send(email);
          console.log("Send result:", result);
        } catch (error) {
          console.error("Send error:", error.message);
        }
      }
    } else {
      // Single email scenarios
      try {
        // First send should succeed
        const firstResult = await emailService.send(scenario.email);
        console.log("First send result:", firstResult);

        // Attempt to send same email again (should fail)
        try {
          await emailService.send(scenario.email);
        } catch (duplicateError) {
          console.log("Duplicate prevention:", duplicateError.message);
        }
      } catch (error) {
        console.error("Scenario error:", error);
      }
    }
  }
}

// Run the demonstration
demonstrateEmailService().catch(console.error);

// module.exports = { demonstrateEmailService };

