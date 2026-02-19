package com.smu.csd;

import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
// import org.springframework.transaction.support.TransactionTemplate;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

import javax.sql.DataSource;
import java.sql.Connection;

@Configuration
public class DatabaseDebugger {

  @PersistenceContext
  private EntityManager em;

  // Testing whether connection is secured and if reading from DB works.
  @Bean
  ApplicationRunner dbDebug(DataSource dataSource) {
    return args -> {
      try (Connection c = dataSource.getConnection()) {
        var md = c.getMetaData();
        System.out.println("JDBC URL       = " + md.getURL());
        System.out.println("JDBC user      = " + md.getUserName());

        var st = c.createStatement();
        var rs = st.executeQuery("""
          select
            current_user,
            current_database(),
            inet_server_addr(),
            inet_server_port(),
            version()
        """);
        if (rs.next()) {
          System.out.println("current_user   = " + rs.getString(1));
          System.out.println("database       = " + rs.getString(2));
          System.out.println("server_addr    = " + rs.getString(3));
          System.out.println("server_port    = " + rs.getInt(4));
          System.out.println("version        = " + rs.getString(5));
        }

        System.out.println("Answer should be however many rows there are in testing: " + em.createNativeQuery("select count(*) from testing").getSingleResult());
      }
    };
  }

  // Testing whether writing to DB works.
  // @Bean
  // ApplicationRunner writeDebug(TransactionTemplate tx, DataSource dataSource) {
  //   return args -> tx.execute(status -> {
  //     em.createNativeQuery("insert into testing (name) values ('tester 3')").executeUpdate();
  //     return null;
  //   });
  // }
  
}

