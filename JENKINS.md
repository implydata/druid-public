# CI Jenkins pipeline

## Overview

`jenkinsfile` contains definition of CI pipeline running on QA-jenkins

Here is link to Druid project on jenkins server: https://ci.qa.imply.io/job/imply-druid/job/druid/

## How it works

The pipeline definition consists of consequent stages: `Maven install` and `Checks`

`Maven install` stage performs building artifacts and uploading them to docker registry as docker images

Two cache images are used:

* druid-m2-cache - contains .m2/repository files
* druid-build-cache - contains local artifacts built from `mvn install` command

`Check` stage contains definition of all jobs running in parallel

Almost every job does the following:

* pulls druid-m2-cache files to temporary workspace
* pulls druid-build-cache files to workspace
* build/launch docker container (based on maven:3.6.3-jdk-8/maven:3.6.3-jdk-11) mounting druid-m2-cache download to `~/.m2`
* run test commands inside created container

## When it works

Build gets triggered in the following cases:

* automatically for every commit of opened PR - jenkins _locally_ merge branch of PR into target and then proceed with merging commit
* automatically for every commit in release branches with the naming format: `d.dd.d-iap` / `d.d.d-iap` (for example 0.19.0-iap or 0.1.0-iap)
* on demand: in every branch

In all these cases jenkinsfile should be exists.


## Job types

All jobs can be divided into five types:

* maven check
* packaging check
* module tests
* integration tests
* other jobs


Each type excluding the last one is defined by its own clojure.

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

## Node types

There two types of nodes mentioned in this jenkinsfile: `lightweightNode` and `heavyNode`

The essential difference between them is number of executor per node: `lightweightNode` has 3 executors which means it can run three jobs simultaneosly - so that type is used for simple jobs that don't use docker runtime (e.g maven check, license check, etc); `heavyNode` has only one executor - so the only one job can be launched on such node - this usefull for expensive jobs and/or jobs that uses docker runtime (integration tests)

In this jenkinsfile there are closures referenced for both types:

```groovy
def heavyNode = { body ->
    node('jenkinsOnDemand') {
        body()
    }
}

def lightweightNode = { body ->
    node('jenkinsOnDemandMultiExec') {
        body()
    }
}
```

So they can used in `Checks` stage:

```groovy
stage('Checks') {
	parallel "job1": {
		stage('Simple check') {
			heavyNode {
				docker.image('maven:3.6.3-jdk-8').inside {'./build'}
			}
		}
	},
	"job2": {
		stage('Integration test') {
			lightweightNode {
				def i = docker.build()
				i.inside{'./build'}
			}
		}
	}
// ...
}
```


## Jenkinsfile structure


`jenkinsfile` can be divided into two parts

* definitions of variables/closures
* stages


```groovy
// definitions:

def VARIABLE1 = "..."
def VARIABLE2 = "..."
// ...
def CLOSURE1 = { /* place pipeline code */}
def CLOSURE2 = { arg, body -> /* other closure can be passed as well as regular arguments */}

// pipeline code

stage('Maven install') {
	\\ performs mvn clean install
}

stage('Checks') {
	parallel "job1": {
		// scripted pipeline code can be placed directly, for example:
		// node('jenkinsOnDemand') {
		//	 docker.image('maven:3.6.3-jdk-8').inside {
		//		sh script: "./build"
		//   }
		// }
	},
	"job2": {
		// .. as well as pre-defined closure:
		// CLOSURE2("arg")
	},
	// ...
	"jobN": {

	}
}



```


The first part is variables/closures are defined - so they can be referenced in second part following DRY principle (don't repeat yourself)

The second part consists, as mentioned earlier, consists of two stages: `Maven install` and `Checks`



## How to add parallel job


Job can added as parrallel stage in `Check` global stage. It can be added directly (see `license checks` for example) or using closure.


## Links

Jenkinsfile in general: https://www.jenkins.io/doc/book/pipeline/jenkinsfile/

Pipeline syntax: https://www.jenkins.io/doc/book/pipeline/syntax/

Using Docker with Pipeline: https://www.jenkins.io/doc/book/pipeline/docker/

