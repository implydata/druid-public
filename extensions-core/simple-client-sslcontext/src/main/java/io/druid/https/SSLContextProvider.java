/*
 * Licensed to Metamarkets Group Inc. (Metamarkets) under one
 * or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership. Metamarkets licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package io.druid.https;

import com.google.inject.Inject;
import com.google.inject.Provider;
import io.druid.java.util.emitter.EmittingLogger;
import io.druid.server.security.TLSUtils;
import io.druid.server.security.TLSCertificateChecker;

import javax.net.ssl.SSLContext;

public class SSLContextProvider implements Provider<SSLContext>
{
  private static final EmittingLogger log = new EmittingLogger(SSLContextProvider.class);

  private SSLClientConfig config;
  private TLSCertificateChecker certificateChecker;

  @Inject
  public SSLContextProvider(
      SSLClientConfig config,
      TLSCertificateChecker certificateChecker
  )
  {
    this.config = config;
    this.certificateChecker = certificateChecker;
  }

  @Override
  public SSLContext get()
  {
    log.info("Creating SslContext for https client using config [%s]", config);

    return new TLSUtils.ClientSSLContextBuilder()
        .setProtocol(config.getProtocol())
        .setTrustStoreType(config.getTrustStoreType())
        .setTrustStorePath(config.getTrustStorePath())
        .setTrustStoreAlgorithm(config.getTrustStoreAlgorithm())
        .setTrustStorePasswordProvider(config.getTrustStorePasswordProvider())
        .setKeyStoreType(config.getKeyStoreType())
        .setKeyStorePath(config.getKeyStorePath())
        .setKeyStoreAlgorithm(config.getKeyManagerFactoryAlgorithm())
        .setCertAlias(config.getCertAlias())
        .setKeyStorePasswordProvider(config.getKeyStorePasswordProvider())
        .setKeyManagerFactoryPasswordProvider(config.getKeyManagerPasswordProvider())
        .setValidateHostnames(config.getValidateHostnames())
        .setCertificateChecker(certificateChecker)
        .build();
  }
}
