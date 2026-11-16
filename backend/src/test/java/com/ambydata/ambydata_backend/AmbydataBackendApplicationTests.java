package com.ambydata.ambydata_backend;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.beans.factory.annotation.Autowired;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Import(TestcontainersConfig.class)
class AmbydataBackendApplicationTests {

	@Autowired
	private MongoTemplate mongoTemplate;

	@Value("${spring.mongodb.database}")
	private String database;

	@Test
	void contextLoads() {
	}

	@Test
	void usaOBancoDeDesenvolvimentoPorPadrao() {
		assertThat(database).isEqualTo("ambydata_dev");
		assertThat(mongoTemplate.getDb().getName()).isEqualTo("ambydata_dev");
	}

}
