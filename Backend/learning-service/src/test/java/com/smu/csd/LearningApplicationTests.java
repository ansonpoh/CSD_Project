package com.smu.csd;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
@Import(TestAiConfig.class)
class LearningApplicationTests {

	@Test
	void contextLoads() {
	}

}
