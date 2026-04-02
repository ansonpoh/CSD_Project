package com.smu.csd;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.lang.annotation.Annotation;
import java.util.Set;

import org.junit.jupiter.api.Test;
import org.mockito.MockedStatic;
import org.mockito.Mockito;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

import io.github.cdimascio.dotenv.Dotenv;
import io.github.cdimascio.dotenv.DotenvBuilder;
import io.github.cdimascio.dotenv.DotenvEntry;

class PlayerApplicationTest {

    @Test
    void main_loadsDotenvEntriesIntoSystemProperties_andRunsSpringApplication() {
        String key = "PLAYER_SERVICE_TEST_PROP";
        String previous = System.getProperty(key);

        DotenvBuilder builder = mock(DotenvBuilder.class);
        Dotenv dotenv = mock(Dotenv.class);
        DotenvEntry entry = mock(DotenvEntry.class);

        when(entry.getKey()).thenReturn(key);
        when(entry.getValue()).thenReturn("set-by-test");
        when(builder.ignoreIfMissing()).thenReturn(builder);
        when(builder.load()).thenReturn(dotenv);
        when(dotenv.entries()).thenReturn(Set.of(entry));

        try (MockedStatic<Dotenv> dotenvStatic = Mockito.mockStatic(Dotenv.class);
             MockedStatic<SpringApplication> springStatic = Mockito.mockStatic(SpringApplication.class)) {
            dotenvStatic.when(Dotenv::configure).thenReturn(builder);
            springStatic.when(() -> SpringApplication.run(eq(PlayerApplication.class), any(String[].class))).thenReturn(null);

            PlayerApplication.main(new String[] {"--spring.main.web-application-type=none"});

            verify(entry, times(1)).getKey();
            verify(entry, times(1)).getValue();
            springStatic.verify(() -> SpringApplication.run(eq(PlayerApplication.class), any(String[].class)), times(1));
            assertEquals("set-by-test", System.getProperty(key));
        } finally {
            if (previous == null) {
                System.clearProperty(key);
            } else {
                System.setProperty(key, previous);
            }
        }
    }

    @Test
    void playerApplication_hasExpectedBootAnnotations() {
        Annotation springBoot = PlayerApplication.class.getAnnotation(SpringBootApplication.class);
        Annotation enableAsync = PlayerApplication.class.getAnnotation(EnableAsync.class);

        assertNotNull(springBoot);
        assertNotNull(enableAsync);
        assertTrue(PlayerApplication.class.getSimpleName().equals("PlayerApplication"));
    }
}
