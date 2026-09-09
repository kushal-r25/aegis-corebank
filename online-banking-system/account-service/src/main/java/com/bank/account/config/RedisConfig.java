package com.bank.account.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.cache.annotation.EnableCaching;

import java.time.Duration;

import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;

@Configuration
@EnableCaching
@ConditionalOnBean(RedisConnectionFactory.class)
public class RedisConfig {

    /**
     * Cache-aside on balance reads only. Short TTL (30s) because the cache is purely a
     * read accelerator for GET /accounts/{id} — the transfer path never trusts it and
     * always reads fresh via findByIdForUpdate. Evict-on-write (see AccountService)
     * keeps this simple instead of trying to keep cache and DB perfectly in sync.
     */
    @Bean
    public RedisCacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        RedisCacheConfiguration config = RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofSeconds(30))
                .disableCachingNullValues()
                .serializeValuesWith(RedisSerializationContext.SerializationPair
                        .fromSerializer(new GenericJackson2JsonRedisSerializer()));

        return RedisCacheManager.builder(connectionFactory)
                .cacheDefaults(config)
                .build();
    }
}
