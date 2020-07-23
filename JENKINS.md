# CI Jenkins pipeline

## Overview

`jenkinsfile` contains definition of CI pipeline running on QA-jenkins

Here is link to Druid project on jenkins server: https://ci.qa.imply.io/job/imply-druid/job/druid/

## How it works

The pipeline definition consists of consequent stages: `Maven install` and `Checks`

`Maven install` stage performs building artifacts and uploading them to docker registry as docker images

Two images are used:

* druid-m2-cache - contains .m2/repository files
* druid-build-cache - contains local artifacts built from `mvn install` command

`Check` stage contains definition of all jobs running in parallel

Almost every job does the following:

* pulls druid-m2-cache files to temporary workspace
* pulls druid-build-cache files to workspace
* build/launch docker container (based on maven:3.6.3-jdk-8/maven:3.6.3-jdk-11) mounting druid-m2-cache download to `~/.m2`
* run test commands inside created container


## Job types

All jobs can be divided into five types:

* maven check
* packaging check
* module tests
* integration tests
* other jobs


Each type excluding the last one has its own clojure define in jenkinsfile:

For example maven check is defined by the following closure:

```groovy
def mavenCheck = { stageName, body ->
    stage(stageName) {
        lightweightNode { // can be launched among other job in the same node
            checkout scm  // checkout from git repo into workspace
            downloadBuildCache() // pull local artifacts from Maven install stage
            withM2Cache { cacheDir -> // pull .m2 cache  and proceed with given path of downloaded directory
                docker.image('maven:3.6.3-jdk-8').inside(
                    "--memory=8g --memory-reservation=4g -e HOME=/tmp -e _JAVA_OPTIONS=-Duser.home=/tmp -v ${cacheDir}/.m2:/tmp/.m2") { // point m2 cache as ~/.m2
                    withArtifactorySettings { // mount settings.xml with access to our artifactory server as ~/.m2/settings.xml
                        body() // run given code
                    }
                }
            }
        }
    }
}
```

So it can be used for all maven check jobs:

```groovy
stage("Checks") {
    parallel "animal sniffer checks": {
        mavenCheck("animal sniffer checks") {
            sh script: "${MVN} animal-sniffer:check --fail-at-end", label: "animal sniffer"
        }
    },
    "checkstyle": {
        mavenCheck("checkstyle") {
            sh script: "${MVN} checkstyle:checkstyle --fail-at-end",label: "checkstyle"
        }
    },
    "enforcer checks": {
        mavenCheck("enforcer checks") {
            sh script: "${MVN} enforcer:enforce --fail-at-end", label: "enforcer checks"
        }
    }
    // and other jobs
}
```


## Jenkinsfile structure


`jenkinsfile` can be divided into two parts

* definitions of variables/closures
* stages


The first part is variables/closures are defined - so they can be referenced in second part following DRY principle (don't repeat yourself)

The second part consists, as mentioned earlier, consists of two stages: `Maven install` and `Checks`



## How to add parallel job


Job can added as parrallel stage in `Check` global stage. It can be added directly (see `license checks` for example) or using closure for convenience (e.g to add en masse, see integration tests)


## Links


Jenkinsfile in general: https://www.jenkins.io/doc/book/pipeline/jenkinsfile/
Pipeline syntax: https://www.jenkins.io/doc/book/pipeline/syntax/
Using Docker with Pipeline: https://www.jenkins.io/doc/book/pipeline/docker/




