package com.ambydata.ambydata_backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class AmbydataBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(AmbydataBackendApplication.class, args);
    }
}
