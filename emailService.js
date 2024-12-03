class EmailService {
  constructor(providers, options = {}) {
    this.providers = providers;
    this.currentProviderIndex = 0;
    this.sentEmails = new Set();

    // Configuration with defaults
    this.config = {
      maxRetries: options.maxRetries || 3,
      baseDelay: options.baseDelay || 1000,
      rateLimitPerMinute: options.rateLimitPerMinute || 10,
      circuitBreakerThreshold: options.circuitBreakerThreshold || 3,
    };

    // Rate limiting tracking
    this.emailsSentInCurrentMinute = 0;
    this.lastResetTime = Date.now();
  }

  // Ensure idempotency by tracking sent emails
  _isEmailUnique(emailId) {
    if (this.sentEmails.has(emailId)) {
      return false;
    }
    this.sentEmails.add(emailId);
    return true;
  }

  // Rate limiting check
  _checkRateLimit() {
    const now = Date.now();

    // Reset counter if a minute has passed
    if (now - this.lastResetTime >= 60000) {
      this.emailsSentInCurrentMinute = 0;
      this.lastResetTime = now;
    }

    if (this.emailsSentInCurrentMinute >= this.config.rateLimitPerMinute) {
      throw new Error("Rate limit exceeded");
    }

    this.emailsSentInCurrentMinute++;
  }

  // Exponential backoff retry logic
  async _sendWithRetry(email) {
    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        const currentProvider = this.providers[this.currentProviderIndex];
        const result = await currentProvider.send(email);
        return result;
      } catch (error) {
        // Exponential backoff
        const delay = this.config.baseDelay * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));

        // Switch to next provider on failure
        this.currentProviderIndex =
          (this.currentProviderIndex + 1) % this.providers.length;
      }
    }

    throw new Error("All email providers failed");
  }

  // Main send method with comprehensive error handling
  async send(email) {
    // Validate email uniqueness
    const emailId = this._generateEmailId(email);
    if (!this._isEmailUnique(emailId)) {
      throw new Error("Duplicate email");
    }

    // Check rate limiting
    this._checkRateLimit();

    try {
      // Attempt to send with retry and fallback
      const result = await this._sendWithRetry(email);

      return {
        status: "success",
        providerId: this.currentProviderIndex,
        messageId: result.messageId,
      };
    } catch (error) {
      return {
        status: "failed",
        error: error.message,
      };
    }
  }

  // Helper to generate unique email identifier
  _generateEmailId(email) {
    return `${email.to}_${email.subject}_${Date.now()}`;
  }
}

// Example Mock Providers
class MockEmailProvider {
  constructor(name, successRate = 0.7) {
    this.name = name;
    this.successRate = successRate;
  }

  async send(email) {
    return new Promise((resolve, reject) => {
      if (Math.random() < this.successRate) {
        resolve({
          messageId: `${this.name}-${Date.now()}`,
          providerName: this.name,
        });
      } else {
        reject(new Error(`${this.name} sending failed`));
      }
    });
  }
}

// Usage Example
async function testEmailService() {
  const providers = [
    new MockEmailProvider("Provider1"),
    new MockEmailProvider("Provider2"),
  ];

  const emailService = new EmailService(providers);

  const email = {
    to: "user@example.com",
    subject: "Test Email",
    body: "Hello, this is a test email.",
  };

  try {
    const result = await emailService.send(email);
    console.log("Email sending result:", result);
  } catch (error) {
    console.error("Email sending error:", error);
  }
}

// Export for testing and usage
module.exports = {
  EmailService,
  MockEmailProvider,
  testEmailService,
};
