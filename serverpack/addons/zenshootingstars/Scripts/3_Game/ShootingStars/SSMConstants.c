class SSMConstants
{
	static const int RPC_SHOOTING_STAR = 89327411;

	// TESTING:
	// true  = fixed test interval.
	// false = random production interval.
	static const bool TEST_MODE = false;

	// Set true only if you want to test the effect during daytime.
	static const bool TEST_IGNORE_DARKNESS = false;

	static const int TEST_INTERVAL_MS = 1000;
	static const int MIN_INTERVAL_MS = 120000;
	static const int MAX_INTERVAL_MS = 600000;
	static const int NIGHT_RECHECK_MS = 30000;

	// IsNight() must be true AND GetSunOrMoon() must reach this threshold.
	// 1.0 is the full "moon/night" side of the engine's sun/moon interpolation.
	static const float DARKNESS_THRESHOLD = 0.95;

	// Keep comfortably inside normal particle rendering range.
	static const float SKY_DISTANCE = 120.0;

	static const float MIN_START_PITCH = 32.0;
	static const float MAX_START_PITCH = 62.0;

	static const float MIN_TRAVEL_YAW = 18.0;
	static const float MAX_TRAVEL_YAW = 32.0;
	static const float MAX_TRAVEL_PITCH = 9.0;

	static const float MIN_END_PITCH = 22.0;
	static const float MAX_END_PITCH = 70.0;

	static const float MIN_DURATION = 0.55;
	static const float MAX_DURATION = 0.75;

	// 80% shower meteors, 20% completely random sporadic meteors.
	static const float RADIANT_METEOR_CHANCE = 0.80;
	static const float SPORADIC_METEOR_CHANCE = 0.20;

	// One radiant is chosen per dark period/night.
	static const float NIGHTLY_RADIANT_MIN_PITCH = 26.0;
	static const float NIGHTLY_RADIANT_MAX_PITCH = 48.0;

	// Starting position of shower meteors relative to the radiant.
	static const float RADIANT_MIN_START_YAW_OFFSET = 22.0;
	static const float RADIANT_MAX_START_YAW_OFFSET = 70.0;
	static const float RADIANT_MIN_START_PITCH_OFFSET = -18.0;
	static const float RADIANT_MAX_START_PITCH_OFFSET = 18.0;

	// Actual angular distance travelled across the celestial sphere.
	static const float RADIANT_MIN_TRAVEL_ANGLE = 18.0;
	static const float RADIANT_MAX_TRAVEL_ANGLE = 32.0;

	// Retry if a generated great-circle trajectory would leave our desired visible sky area.
	static const int RADIANT_GENERATION_ATTEMPTS = 12;
};
