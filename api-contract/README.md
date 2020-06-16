<!--
  ~ Licensed to the Apache Software Foundation (ASF) under one
  ~ or more contributor license agreements.  See the NOTICE file
  ~ distributed with this work for additional information
  ~ regarding copyright ownership.  The ASF licenses this file
  ~ to you under the Apache License, Version 2.0 (the
  ~ "License"); you may not use this file except in compliance
  ~ with the License.  You may obtain a copy of the License at
  ~
  ~   http://www.apache.org/licenses/LICENSE-2.0
  ~
  ~ Unless required by applicable law or agreed to in writing,
  ~ software distributed under the License is distributed on an
  ~ "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
  ~ KIND, either express or implied.  See the License for the
  ~ specific language governing permissions and limitations
  ~ under the License.
  -->

Druid API Contract 
===================

This module contains OpenApi definition for druid-api.
Definition covers backendside endpoints for:
- Router API

Generated Java API Client for Druid API
-------------------

To build java api client for druid api,  run 

`mvn clean install`

The generated client will be in : /api-contract/target/generated-sources/api-client

which will have next main folders:
- "api" - OpenApi yaml
- "docs" - documents & examples on how to work with the API client

OpenAPI Overview
----------------------

The OpenAPI Specification (OAS) defines a standard, language-agnostic interface to RESTful APIs which allows both humans and computers to discover and understand the capabilities of the service without access to source code, documentation, or through network traffic inspection. [more details](https://swagger.io/specification/)

OpenAPI Specification can be written in any editor, you can also use [online editor](https://editor.swagger.io/)

OpenAPI specification can be used to generate client/server code.
The current implementation uses [openapi-generator-maven-plugin](https://github.com/OpenAPITools/openapi-generator/tree/master/modules/openapi-generator-maven-plugin) to generate the code.

More OpenAPI tools can be found in https://openapi.tools/

Best practices on how to work with the OpenAPI specification:
1. Prepare the specification document.
2. Generate the server & client code.
3. Implement the server based on the generated server code.
4. Use generated client to do calls to server
5. Prepare the CI build steps that will push the new version of generated api client into Artifactory

If your project has java-backend, java-client, react-ui,  you can generate 2 clients and 1 backend to use them in the project. If you need to modify an endpoint (e.g. change path/request-respose body/params), you'll need to update the specification document and generate new code again.  All clients should be in sync with the server on the same version of the generated API. 

What to Do When Adding, Changing, or Deleting an Endpoint
-------------------

The idea is that we want to reuse the generated code for the backend.  We decided not to generate "jersey 1 backend" because it's harder to reuse with the existing code.  What can be reused from OpenAPI specification document/generated code for the backend:
- Components (Models for RequestBody, ResponseBody). We need to remove the existing models in Resources classes and use the generated models. 

To add a new endpoint:

1. Add the new endpoint specification to the contract document.  Also prepare Components if needed
2. Rebuild api-contract module.
3. Use the generated Models from the backend.

To change an endpoint:

If the change is related to RequestBody/ResponseBody/Path/Query params/etc:

1. Update the specification document for the endpoint.
2. Rebuild the api-contract module.

To delete an endpoint:

Cleanup endpoint and components from the specification document.

How to Use the API Client
-------------------

1. Add "api-contract" as a dependency in your module:

        <dependency>
            <groupId>org.apache.druid</groupId>
            <artifactId>api-contract</artifactId>
        </dependency>

2. See usages in the tests on how to do api calls via the client.

How to Generate New API Client/Server
-------------------

To generate new API client/server, add new <execution> into the <executions> configuration of openapi-generator-maven-plugin in pom.xml:
```xml
    <execution>
        <id>generate-TODO-api</id>
        <goals>
            <goal>generate</goal>
        </goals>
        <configuration>
            <inputSpec>${project.basedir}/src/main/resources/schema/druid-api.yml</inputSpec>
            <output>${project.build.directory}/generated-sources/TODO</output>
            <generatorName>TODO</generatorName>
            <generateModelTests>false</generateModelTests>
            <generateApiTests>false</generateApiTests>
            <!--   <configHelp>true</configHelp>    -->
    
            <configOptions>
    
            </configOptions>
        </configuration>
    </execution>
```
1.  Run `mvn clean install`: You will get an error that the "TODO" generator does not exist.  In the stack trace you can see the names of all existing generators. You can use that list to decide on a generator that you need.
2. Update pom.xml with the chosen generator name.
3. Run `mvn clean install` again:  If you get a different error, first check to see if openapi-generator-maven-plugin can generate the code for you: Open the folder `/api-contract/target/generated-sources/` and check that a `TODO` folder is there.  If it does not exist, you may need to update the configuration.  If it exists but you still have errors, then most likely the errors come from the compilation with missing dependencies.  The code generation has dependencies on other libraries, such as jersey1, spring, rest-easy, etc.  Only the "java-native" generator does not require any dependency, but it requires java 11+.  You'll need to fix the dependencies first.
4. You can also check specific configuration options for your generator: Uncomment `configHelp true` from your <execution> in pom.xml and run `mvn clean install` again. In the stack trace you will see all additional parameters that you can add into the configuration.  These parameters can also affect the generated code.
5. Once you have the generated code, verify that the code works for you.  Work with the generator and/or update the configuration, then repeat this process until the generated code works for you.  You may need to switch to a different generator altogether. 