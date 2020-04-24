/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package org.apache.druid.tests.indexer;

import com.google.common.collect.ImmutableMap;
import com.google.inject.Inject;
import org.apache.druid.indexing.overlord.supervisor.SupervisorStateManager;
import org.apache.druid.java.util.common.DateTimes;
import org.apache.druid.java.util.common.logger.Logger;
import org.apache.druid.testing.IntegrationTestingConfig;
import org.apache.druid.testing.utils.DruidClusterAdminClient;
import org.apache.druid.testing.utils.ITRetryUtil;
import org.apache.druid.testing.utils.StreamAdminClient;
import org.apache.druid.testing.utils.StreamEventWriter;
import org.apache.druid.testing.utils.WikipediaStreamEventStreamGenerator;
import org.joda.time.DateTime;
import org.joda.time.format.DateTimeFormat;
import org.joda.time.format.DateTimeFormatter;

import java.io.Closeable;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;

public abstract class AbstractStreamIndexingTest extends AbstractIndexerTest
{
  static final DateTime FIRST_EVENT_TIME = DateTimes.of(1994, 4, 29, 1, 0);
  // format for the querying interval
  static final DateTimeFormatter INTERVAL_FMT = DateTimeFormat.forPattern("yyyy-MM-dd'T'HH:mm:'00Z'");
  // format for the expected timestamp in a query response
  static final DateTimeFormatter TIMESTAMP_FMT = DateTimeFormat.forPattern("yyyy-MM-dd'T'HH:mm:ss'.000Z'");
  static final int EVENTS_PER_SECOND = 6;
  static final int TOTAL_NUMBER_OF_SECOND = 10;
  // Since this integration test can terminates or be killed un-expectedly, this tag is added to all streams created
  // to help make stream clean up easier. (Normally, streams should be cleanup automattically by the teardown method)
  // The value to this tag is a timestamp that can be used by a lambda function to remove unused stream.
  private static final String STREAM_EXPIRE_TAG = "druid-ci-expire-after";
  private static final int STREAM_SHARD_COUNT = 2;
  private static final long WAIT_TIME_MILLIS = 3 * 60 * 1000L;
  private static final String INDEXER_FILE_LEGACY_PARSER = "/indexer/stream_supervisor_spec_legacy_parser.json";
  private static final String INDEXER_FILE_INPUT_FORMAT = "/indexer/stream_supervisor_spec_input_format.json";
  private static final String QUERIES_FILE = "/indexer/stream_index_queries.json";
  private static final long CYCLE_PADDING_MS = 100;
  private static final Logger LOG = new Logger(AbstractStreamIndexingTest.class);

  @Inject
  private DruidClusterAdminClient druidClusterAdminClient;

  @Inject
  private IntegrationTestingConfig config;

  private StreamAdminClient streamAdminClient;
  private WikipediaStreamEventStreamGenerator wikipediaStreamEventGenerator;

  abstract StreamAdminClient createStreamAdminClient(IntegrationTestingConfig config) throws Exception;
  abstract StreamEventWriter createStreamEventWriter(IntegrationTestingConfig config) throws Exception;
  abstract Function<String, String> generateStreamIngestionPropsTransform(String streamName,
                                                                          String fullDatasourceName,
                                                                          IntegrationTestingConfig config);
  abstract Function<String, String> generateStreamQueryPropsTransform(String streamName, String fullDatasourceName);
  public abstract String getTestNamePrefix();

  protected void doBeforeClass() throws Exception
  {
    streamAdminClient = createStreamAdminClient(config);
    wikipediaStreamEventGenerator = new WikipediaStreamEventStreamGenerator(EVENTS_PER_SECOND, CYCLE_PADDING_MS);
  }

  protected void doClassTeardown()
  {
    wikipediaStreamEventGenerator.shutdown();
  }

  protected void doTestIndexDataWithLegacyParserStableState() throws Exception
  {
    StreamEventWriter streamEventWriter = createStreamEventWriter(config);
    final GeneratedTestConfig generatedTestConfig = new GeneratedTestConfig();
    try (
        final Closeable ignored1 = unloader(generatedTestConfig.getFullDatasourceName())
    ) {
      final String taskSpec = generatedTestConfig.getStreamIngestionPropsTransform().apply(getResourceAsString(INDEXER_FILE_LEGACY_PARSER));
      LOG.info("supervisorSpec: [%s]\n", taskSpec);
      // Start supervisor
      generatedTestConfig.setSupervisorId(indexer.submitSupervisor(taskSpec));
      LOG.info("Submitted supervisor");
      // Start data generator
      wikipediaStreamEventGenerator.run(generatedTestConfig.getStreamName(), streamEventWriter, TOTAL_NUMBER_OF_SECOND, FIRST_EVENT_TIME);
      verifyIngestedData(generatedTestConfig);
    }
    finally {
      doMethodTeardown(generatedTestConfig, streamEventWriter);
    }
  }

  protected void doTestIndexDataWithInputFormatStableState() throws Exception
  {
    StreamEventWriter streamEventWriter = createStreamEventWriter(config);
    final GeneratedTestConfig generatedTestConfig = new GeneratedTestConfig();
    try (
        final Closeable ignored1 = unloader(generatedTestConfig.getFullDatasourceName())
    ) {
      final String taskSpec = generatedTestConfig.getStreamIngestionPropsTransform().apply(getResourceAsString(INDEXER_FILE_INPUT_FORMAT));
      LOG.info("supervisorSpec: [%s]\n", taskSpec);
      // Start supervisor
      generatedTestConfig.setSupervisorId(indexer.submitSupervisor(taskSpec));
      LOG.info("Submitted supervisor");
      // Start data generator
      wikipediaStreamEventGenerator.run(generatedTestConfig.getStreamName(), streamEventWriter, TOTAL_NUMBER_OF_SECOND, FIRST_EVENT_TIME);
      verifyIngestedData(generatedTestConfig);
    }
    finally {
      doMethodTeardown(generatedTestConfig, streamEventWriter);
    }
  }

  void doTestIndexDataWithLosingCoordinator() throws Exception
  {
    testIndexWithLosingNodeHelper(() -> druidClusterAdminClient.restartCoordinatorContainer(), () -> druidClusterAdminClient.waitUntilCoordinatorReady());
  }

  void doTestIndexDataWithLosingOverlord() throws Exception
  {
    testIndexWithLosingNodeHelper(() -> druidClusterAdminClient.restartIndexerContainer(), () -> druidClusterAdminClient.waitUntilIndexerReady());
  }

  void doTestIndexDataWithLosingHistorical() throws Exception
  {
    testIndexWithLosingNodeHelper(() -> druidClusterAdminClient.restartHistoricalContainer(), () -> druidClusterAdminClient.waitUntilHistoricalReady());
  }

  protected void doTestIndexDataWithStartStopSupervisor() throws Exception
  {
    StreamEventWriter streamEventWriter = createStreamEventWriter(config);
    final GeneratedTestConfig generatedTestConfig = new GeneratedTestConfig();
    try (
        final Closeable ignored1 = unloader(generatedTestConfig.getFullDatasourceName())
    ) {
      final String taskSpec = generatedTestConfig.getStreamIngestionPropsTransform().apply(getResourceAsString(INDEXER_FILE_INPUT_FORMAT));
      LOG.info("supervisorSpec: [%s]\n", taskSpec);
      // Start supervisor
      generatedTestConfig.setSupervisorId(indexer.submitSupervisor(taskSpec));
      LOG.info("Submitted supervisor");
      // Start generating half of the data
      int secondsToGenerateRemaining = TOTAL_NUMBER_OF_SECOND;
      int secondsToGenerateFirstRound = TOTAL_NUMBER_OF_SECOND / 2;
      secondsToGenerateRemaining = secondsToGenerateRemaining - secondsToGenerateFirstRound;
      wikipediaStreamEventGenerator.run(generatedTestConfig.getStreamName(), streamEventWriter, secondsToGenerateFirstRound, FIRST_EVENT_TIME);
      // Verify supervisor is healthy before suspension
      ITRetryUtil.retryUntil(
          () -> SupervisorStateManager.BasicState.RUNNING.equals(indexer.getSupervisorStatus(generatedTestConfig.getSupervisorId())),
          true,
          10000,
          30,
          "Waiting for supervisor to be healthy"
      );
      // Suspend the supervisor
      indexer.suspendSupervisor(generatedTestConfig.getSupervisorId());
      // Start generating remainning half of the data
      wikipediaStreamEventGenerator.run(generatedTestConfig.getStreamName(), streamEventWriter, secondsToGenerateRemaining, FIRST_EVENT_TIME.plusSeconds(secondsToGenerateFirstRound));
      // Resume the supervisor
      indexer.resumeSupervisor(generatedTestConfig.getSupervisorId());
      // Verify supervisor is healthy after suspension
      ITRetryUtil.retryUntil(
          () -> SupervisorStateManager.BasicState.RUNNING.equals(indexer.getSupervisorStatus(generatedTestConfig.getSupervisorId())),
          true,
          10000,
          30,
          "Waiting for supervisor to be healthy"
      );
      // Verify that supervisor can catch up with the stream
      verifyIngestedData(generatedTestConfig);
    }
    finally {
      doMethodTeardown(generatedTestConfig, streamEventWriter);
    }
  }

  protected void doTestIndexDataWithStreamReshardSplit() throws Exception
  {
    // Reshard the stream from STREAM_SHARD_COUNT to STREAM_SHARD_COUNT * 2
    testIndexWithStreamReshardHelper(STREAM_SHARD_COUNT * 2);
  }

  protected void doTestIndexDataWithStreamReshardMerge() throws Exception
  {
    // Reshard the stream from STREAM_SHARD_COUNT to STREAM_SHARD_COUNT / 2
    testIndexWithStreamReshardHelper(STREAM_SHARD_COUNT / 2);
  }

  private void testIndexWithLosingNodeHelper(Runnable restartRunnable, Runnable waitForReadyRunnable) throws Exception
  {
    StreamEventWriter streamEventWriter = createStreamEventWriter(config);
    final GeneratedTestConfig generatedTestConfig = new GeneratedTestConfig();
    try (
        final Closeable ignored1 = unloader(generatedTestConfig.getFullDatasourceName())
    ) {
      final String taskSpec = generatedTestConfig.getStreamIngestionPropsTransform().apply(getResourceAsString(INDEXER_FILE_INPUT_FORMAT));
      LOG.info("supervisorSpec: [%s]\n", taskSpec);
      // Start supervisor
      generatedTestConfig.setSupervisorId(indexer.submitSupervisor(taskSpec));
      LOG.info("Submitted supervisor");
      // Start generating one third of the data (before restarting)
      int secondsToGenerateRemaining = TOTAL_NUMBER_OF_SECOND;
      int secondsToGenerateFirstRound = TOTAL_NUMBER_OF_SECOND / 3;
      secondsToGenerateRemaining = secondsToGenerateRemaining - secondsToGenerateFirstRound;
      wikipediaStreamEventGenerator.run(generatedTestConfig.getStreamName(), streamEventWriter, secondsToGenerateFirstRound, FIRST_EVENT_TIME);
      // Verify supervisor is healthy before restart
      ITRetryUtil.retryUntil(
          () -> SupervisorStateManager.BasicState.RUNNING.equals(indexer.getSupervisorStatus(generatedTestConfig.getSupervisorId())),
          true,
          10000,
          30,
          "Waiting for supervisor to be healthy"
      );
      // Restart Druid process
      LOG.info("Restarting Druid process");
      restartRunnable.run();
      LOG.info("Restarted Druid process");
      // Start generating one third of the data (while restarting)
      int secondsToGenerateSecondRound = TOTAL_NUMBER_OF_SECOND / 3;
      secondsToGenerateRemaining = secondsToGenerateRemaining - secondsToGenerateSecondRound;
      wikipediaStreamEventGenerator.run(generatedTestConfig.getStreamName(), streamEventWriter, secondsToGenerateSecondRound, FIRST_EVENT_TIME.plusSeconds(secondsToGenerateFirstRound));
      // Wait for Druid process to be available
      LOG.info("Waiting for Druid process to be available");
      waitForReadyRunnable.run();
      LOG.info("Druid process is now available");
      // Start generating remaining data (after restarting)
      wikipediaStreamEventGenerator.run(generatedTestConfig.getStreamName(), streamEventWriter, secondsToGenerateRemaining, FIRST_EVENT_TIME.plusSeconds(secondsToGenerateFirstRound + secondsToGenerateSecondRound));
      // Verify supervisor is healthy
      ITRetryUtil.retryUntil(
          () -> SupervisorStateManager.BasicState.RUNNING.equals(indexer.getSupervisorStatus(generatedTestConfig.getSupervisorId())),
          true,
          10000,
          30,
          "Waiting for supervisor to be healthy"
      );
      // Verify that supervisor ingested all data
      verifyIngestedData(generatedTestConfig);
    }
    finally {
      doMethodTeardown(generatedTestConfig, streamEventWriter);
    }
  }

  private void testIndexWithStreamReshardHelper(int newShardCount) throws Exception
  {
    StreamEventWriter streamEventWriter = createStreamEventWriter(config);
    final GeneratedTestConfig generatedTestConfig = new GeneratedTestConfig();
    try (
        final Closeable ignored1 = unloader(generatedTestConfig.getFullDatasourceName())
    ) {
      final String taskSpec = generatedTestConfig.getStreamIngestionPropsTransform().apply(getResourceAsString(INDEXER_FILE_INPUT_FORMAT));
      LOG.info("supervisorSpec: [%s]\n", taskSpec);
      // Start supervisor
      generatedTestConfig.setSupervisorId(indexer.submitSupervisor(taskSpec));
      LOG.info("Submitted supervisor");
      // Start generating one third of the data (before resharding)
      int secondsToGenerateRemaining = TOTAL_NUMBER_OF_SECOND;
      int secondsToGenerateFirstRound = TOTAL_NUMBER_OF_SECOND / 3;
      secondsToGenerateRemaining = secondsToGenerateRemaining - secondsToGenerateFirstRound;
      wikipediaStreamEventGenerator.run(generatedTestConfig.getStreamName(), streamEventWriter, secondsToGenerateFirstRound, FIRST_EVENT_TIME);
      // Verify supervisor is healthy before resahrding
      ITRetryUtil.retryUntil(
          () -> SupervisorStateManager.BasicState.RUNNING.equals(indexer.getSupervisorStatus(generatedTestConfig.getSupervisorId())),
          true,
          10000,
          30,
          "Waiting for supervisor to be healthy"
      );
      // Reshard the supervisor by split from STREAM_SHARD_COUNT to newShardCount and waits until the resharding starts
      streamAdminClient.updatePartitionCount(generatedTestConfig.getStreamName(), newShardCount, true);
      // Start generating one third of the data (while resharding)
      int secondsToGenerateSecondRound = TOTAL_NUMBER_OF_SECOND / 3;
      secondsToGenerateRemaining = secondsToGenerateRemaining - secondsToGenerateSecondRound;
      wikipediaStreamEventGenerator.run(generatedTestConfig.getStreamName(), streamEventWriter, secondsToGenerateSecondRound, FIRST_EVENT_TIME.plusSeconds(secondsToGenerateFirstRound));
      // Wait for stream to finish resharding
      ITRetryUtil.retryUntil(
          () -> streamAdminClient.isStreamActive(generatedTestConfig.getStreamName()),
          true,
          10000,
          30,
          "Waiting for stream to finish resharding"
      );
      ITRetryUtil.retryUntil(
          () -> streamAdminClient.verfiyPartitionCountUpdated(generatedTestConfig.getStreamName(), STREAM_SHARD_COUNT, newShardCount),
          true,
          10000,
          30,
          "Waiting for stream to finish resharding"
      );
      // Start generating remaining data (after resharding)
      wikipediaStreamEventGenerator.run(generatedTestConfig.getStreamName(), streamEventWriter, secondsToGenerateRemaining, FIRST_EVENT_TIME.plusSeconds(secondsToGenerateFirstRound + secondsToGenerateSecondRound));
      // Verify supervisor is healthy after resahrding
      ITRetryUtil.retryUntil(
          () -> SupervisorStateManager.BasicState.RUNNING.equals(indexer.getSupervisorStatus(generatedTestConfig.getSupervisorId())),
          true,
          10000,
          30,
          "Waiting for supervisor to be healthy"
      );
      // Verify that supervisor can catch up with the stream
      verifyIngestedData(generatedTestConfig);
    }
    finally {
      doMethodTeardown(generatedTestConfig, streamEventWriter);
    }
  }

  private void verifyIngestedData(GeneratedTestConfig generatedTestConfig) throws Exception
  {
    // Wait for supervisor to consume events
    LOG.info("Waiting for [%s] millis for stream indexing tasks to consume events", WAIT_TIME_MILLIS);
    Thread.sleep(WAIT_TIME_MILLIS);
    // Query data
    final String querySpec = generatedTestConfig.getStreamQueryPropsTransform().apply(getResourceAsString(QUERIES_FILE));
    // this query will probably be answered from the indexing tasks but possibly from 2 historical segments / 2 indexing
    this.queryHelper.testQueriesFromString(querySpec, 2);
    LOG.info("Shutting down supervisor");
    indexer.shutdownSupervisor(generatedTestConfig.getSupervisorId());
    // wait for all indexing tasks to finish
    LOG.info("Waiting for all indexing tasks to finish");
    ITRetryUtil.retryUntilTrue(
        () -> (indexer.getUncompletedTasksForDataSource(generatedTestConfig.getFullDatasourceName()).size() == 0),
        "Waiting for Tasks Completion"
    );
    // wait for segments to be handed off
    ITRetryUtil.retryUntil(
        () -> coordinator.areSegmentsLoaded(generatedTestConfig.getFullDatasourceName()),
        true,
        10000,
        30,
        "Real-time generated segments loaded"
    );

    // this query will be answered by at least 1 historical segment, most likely 2, and possibly up to all 4
    this.queryHelper.testQueriesFromString(querySpec, 2);
  }

  long getSumOfEventSequence(int numEvents)
  {
    return (numEvents * (1 + numEvents)) / 2;
  }

  private void doMethodTeardown(GeneratedTestConfig generatedTestConfig, StreamEventWriter streamEventWriter)
  {
    try {
      streamEventWriter.flush();
      streamEventWriter.shutdown();
    }
    catch (Exception e) {
      // Best effort cleanup as the writer may have already been cleanup
      LOG.warn(e, "Failed to cleanup writer. This might be expected depending on the test method");
    }
    try {
      indexer.shutdownSupervisor(generatedTestConfig.getSupervisorId());
    }
    catch (Exception e) {
      // Best effort cleanup as the supervisor may have already been cleanup
      LOG.warn(e, "Failed to cleanup supervisor. This might be expected depending on the test method");
    }
    try {
      unloader(generatedTestConfig.getFullDatasourceName());
    }
    catch (Exception e) {
      // Best effort cleanup as the datasource may have already been cleanup
      LOG.warn(e, "Failed to cleanup datasource. This might be expected depending on the test method");
    }
    try {
      streamAdminClient.deleteStream(generatedTestConfig.getStreamName());
    }
    catch (Exception e) {
      // Best effort cleanup as the stream may have already been cleanup
      LOG.warn(e, "Failed to cleanup stream. This might be expected depending on the test method");
    }
  }

  private class GeneratedTestConfig
  {
    private String streamName;
    private String fullDatasourceName;
    private String supervisorId;
    private Function<String, String> streamIngestionPropsTransform;
    private Function<String, String> streamQueryPropsTransform;

    GeneratedTestConfig() throws Exception
    {
      streamName = getTestNamePrefix() + "_index_test_" + UUID.randomUUID();
      String datasource = getTestNamePrefix() + "_indexing_service_test_" + UUID.randomUUID();
      Map<String, String> tags = ImmutableMap.of(STREAM_EXPIRE_TAG, Long.toString(DateTimes.nowUtc().plusMinutes(30).getMillis()));
      streamAdminClient.createStream(streamName, STREAM_SHARD_COUNT, tags);
      ITRetryUtil.retryUntil(
          () -> streamAdminClient.isStreamActive(streamName),
          true,
          10000,
          30,
          "Wait for stream active"
      );
      fullDatasourceName = datasource + config.getExtraDatasourceNameSuffix();
      streamIngestionPropsTransform = generateStreamIngestionPropsTransform(streamName, fullDatasourceName, config);
      streamQueryPropsTransform = generateStreamQueryPropsTransform(streamName, fullDatasourceName);
    }

    public String getSupervisorId()
    {
      return supervisorId;
    }

    public void setSupervisorId(String supervisorId)
    {
      this.supervisorId = supervisorId;
    }

    public String getStreamName()
    {
      return streamName;
    }

    public String getFullDatasourceName()
    {
      return fullDatasourceName;
    }

    public Function<String, String> getStreamIngestionPropsTransform()
    {
      return streamIngestionPropsTransform;
    }

    public Function<String, String> getStreamQueryPropsTransform()
    {
      return streamQueryPropsTransform;
    }
  }
}