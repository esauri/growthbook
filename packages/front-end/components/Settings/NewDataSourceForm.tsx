import {
  FC,
  useState,
  useEffect,
  ChangeEventHandler,
  ReactElement,
} from "react";
import {
  DataSourceInterfaceWithParams,
  DataSourceSettings,
} from "back-end/types/datasource";
import { useForm } from "react-hook-form";
import cloneDeep from "lodash/cloneDeep";
import { MetricType } from "@/../back-end/types/metric";
import { TrackedEventData } from "@/../back-end/src/types/Integration";
import { isDemoDatasourceProject } from "shared/demo-datasource";
import Link from "next/link";
import { useAuth } from "@/services/auth";
import track from "@/services/track";
import { getInitialSettings } from "@/services/datasources";
import {
  eventSchemas,
  dataSourceConnections,
  eventSchema,
} from "@/services/eventSchema";
import MultiSelectField from "@/components/Forms/MultiSelectField";
import { useDefinitions } from "@/services/DefinitionsContext";
import usePermissions from "@/hooks/usePermissions";
import { hasFileConfig } from "@/services/env";
import SelectField from "../Forms/SelectField";
import Field from "../Forms/Field";
import Modal from "../Modal";
import { GBCircleArrowLeft } from "../Icons";
import Button from "../Button";
import { DocLink } from "../DocLink";
import Tooltip from "../Tooltip/Tooltip";
import EventSourceList from "./EventSourceList";
import ConnectionSettings from "./ConnectionSettings";
import AutoMetricCard from "./AutoMetricCard";

const NewDataSourceForm: FC<{
  data: Partial<DataSourceInterfaceWithParams>;
  existing: boolean;
  source: string;
  onCancel?: () => void;
  onSuccess: (id: string) => Promise<void>;
  showImportSampleData: boolean;
  inline?: boolean;
  secondaryCTA?: ReactElement;
}> = ({
  data,
  onSuccess,
  onCancel,
  source,
  existing,
  showImportSampleData,
  inline,
  secondaryCTA,
}) => {
  const {
    projects: allProjects,
    project,
    getDatasourceById,
    mutateDefinitions,
  } = useDefinitions();
  const [step, setStep] = useState(0);
  const [schema, setSchema] = useState("");
  const [dataSourceId, setDataSourceId] = useState<string | null>(
    data?.id || null
  );
  const [autoMetricError, setAutoMetricError] = useState("");
  const [possibleTypes, setPossibleTypes] = useState(
    dataSourceConnections.map((d) => d.type)
  );
  const [trackedEvents, setTrackedEvents] = useState<TrackedEventData[]>([]);

  const permissions = usePermissions();

  const [datasource, setDatasource] = useState<
    Partial<DataSourceInterfaceWithParams>
  >(data);
  const [lastError, setLastError] = useState("");
  const DEFAULT_DATA_SOURCE: Partial<DataSourceInterfaceWithParams> = {
    name: "My Datasource",
    settings: {},
  };

  const [
    datasourceSupportsAutoGeneratedMetrics,
    setDatasourceSupportsAutoGeneratedMetrics,
  ] = useState<boolean>(false);

  useEffect(() => {
    if (dataSourceId) {
      mutateDefinitions();
      const datasourceObj = getDatasourceById(dataSourceId);
      const supportsAutoGeneratedMetrics =
        datasourceObj?.properties?.supportsAutoGeneratedMetrics || false;
      setDatasourceSupportsAutoGeneratedMetrics(supportsAutoGeneratedMetrics);
    }
  }, [
    dataSourceId,
    datasource.properties?.supportsAutoGeneratedMetrics,
    datasourceSupportsAutoGeneratedMetrics,
    getDatasourceById,
    mutateDefinitions,
  ]);

  const form = useForm<{
    settings: DataSourceSettings | undefined;
    metricsToCreate: {
      name: string;
      sql: string;
      type: MetricType;
    }[];
  }>({
    defaultValues: {
      settings: data?.settings || DEFAULT_DATA_SOURCE.settings,
      metricsToCreate: [],
    },
  });
  const schemasMap = new Map();
  const dataSourcesMap = new Map();
  eventSchemas.forEach((o) => {
    schemasMap.set(o.value, o);
  });
  dataSourceConnections.forEach((d) => {
    dataSourcesMap.set(d.type, d);
  });
  const selectedSchema = schemasMap.get(schema) || {
    value: "custom",
    label: "Custom",
  };
  useEffect(() => {
    track("View Datasource Form", {
      source,
      newDatasourceForm: true,
    });
  }, [source]);

  useEffect(() => {
    const updatedMetricsToCreate: {
      name: string;
      sql: string;
      type: MetricType;
    }[] = [];
    trackedEvents.forEach((event: TrackedEventData) => {
      event.metricsToCreate.forEach((metric) => {
        if (metric.shouldCreate) {
          updatedMetricsToCreate.push({
            name: metric.name,
            type: metric.type,
            sql: metric.sql,
          });
        }
      });
    });
    form.setValue("metricsToCreate", updatedMetricsToCreate);
  }, [form, trackedEvents]);

  const { apiCall, orgId } = useAuth();

  // Filter out demo datasource from available projects
  const projects = allProjects.filter(
    (p) =>
      !isDemoDatasourceProject({
        projectId: p.id,
        organizationId: orgId || "",
      })
  );

  if (!datasource) {
    return null;
  }

  let ctaEnabled = true;
  let disabledMessage = null;

  if (!permissions.check("createDatasources", project)) {
    ctaEnabled = false;
    // @ts-expect-error TS(2322) If you come across this, please fix it!: Type '"You don't have permission to create data so... Remove this comment to see the full error message
    disabledMessage = "You don't have permission to create data sources.";
  }

  const saveDataConnection = async () => {
    setLastError("");

    try {
      if (!datasource.type) {
        throw new Error("Please select a data source type");
      }

      // Update
      if (dataSourceId) {
        const res = await apiCall<{ status: number; message: string }>(
          `/datasource/${dataSourceId}`,
          {
            method: "PUT",
            body: JSON.stringify(datasource),
          }
        );
        track("Updating Datasource Form", {
          source,
          type: datasource.type,
          schema: schema,
          newDatasourceForm: true,
        });
        if (res.status > 200) {
          throw new Error(res.message);
        }
      }
      // Create
      else {
        const updatedDatasource = {
          ...datasource,
          settings: {
            ...getInitialSettings(
              selectedSchema.value,
              // @ts-expect-error TS(2345) If you come across this, please fix it!: Argument of type 'PostgresConnectionParams | Athen... Remove this comment to see the full error message
              datasource.params,
              form.watch("settings.schemaOptions")
            ),
            ...(datasource.settings || {}),
          },
        };
        const res = await apiCall<{ id: string }>(`/datasources`, {
          method: "POST",
          body: JSON.stringify(updatedDatasource),
        });
        track("Submit Datasource Form", {
          source,
          type: datasource.type,
          schema,
          newDatasourceForm: true,
        });
        setDataSourceId(res.id);
        setDatasource(
          updatedDatasource as Partial<DataSourceInterfaceWithParams>
        );
        return res.id;
      }
    } catch (e) {
      track("Data Source Form Error", {
        source,
        type: datasource.type,
        error: e.message.substr(0, 32) + "...",
        newDatasourceForm: true,
      });
      setLastError(e.message);
      throw e;
    }
  };

  const updateSettings = async () => {
    const settings = getInitialSettings(
      selectedSchema.value,
      // @ts-expect-error TS(2345) If you come across this, please fix it!: Argument of type 'PostgresConnectionParams | Athen... Remove this comment to see the full error message
      datasource.params,
      form.watch("settings.schemaOptions")
    );
    if (!dataSourceId) {
      throw new Error("Could not find existing data source id");
    }

    const newVal = {
      ...datasource,
      settings,
      metricsToCreate: form.watch("metricsToCreate"),
    };
    setDatasource(newVal as Partial<DataSourceInterfaceWithParams>);
    await apiCall<{ status: number; message: string }>(
      `/datasource/${dataSourceId}`,
      {
        method: "PUT",
        body: JSON.stringify(newVal),
      }
    );
    track("Saving Datasource Query Settings", {
      source,
      type: datasource.type,
      schema: schema,
      newDatasourceForm: true,
    });
  };

  const onChange: ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement> = (
    e
  ) => {
    setDatasource({
      ...datasource,
      [e.target.name]: e.target.value,
    });
  };
  const onManualChange = (name, value) => {
    setDatasource({
      ...datasource,
      [name]: value,
    });
  };

  const setSchemaSettings = (s: eventSchema) => {
    setSchema(s.value);
    form.setValue("settings.schemaFormat", s.value);
    track("Selected Event Schema", {
      schema: s.value,
      source,
      newDatasourceForm: true,
    });
    // @ts-expect-error TS(2532) If you come across this, please fix it!: Object is possibly 'undefined'.
    if (s.types.length === 1) {
      // @ts-expect-error TS(2532) If you come across this, please fix it!: Object is possibly 'undefined'.
      const data = dataSourcesMap.get(s.types[0]);
      setDatasource({
        ...datasource,
        // @ts-expect-error TS(2532) If you come across this, please fix it!: Object is possibly 'undefined'.
        type: s.types[0],
        name: `${s.label}`,
        params: data.default,
      } as Partial<DataSourceInterfaceWithParams>);
    } else {
      setDatasource({
        name: `${s.label}`,
        settings: {},
        projects: project ? [project] : [],
      });
    }
    // @ts-expect-error TS(2345) If you come across this, please fix it!: Argument of type 'DataSourceType[] | undefined' is... Remove this comment to see the full error message
    setPossibleTypes(s.types);
    if (s.options) {
      s.options.map((o) => {
        form.setValue(`settings.schemaOptions.${o.name}`, o.defaultValue || "");
      });
    } else {
      form.setValue(`settings.schemaOptions`, {});
    }
  };

  const hasStep2 = !!selectedSchema?.options;
  const isFinalStep = step === 2 || (!hasStep2 && step === 1);
  const updateSettingsRequired = isFinalStep && dataSourceId && step !== 1;

  const submit =
    step === 0
      ? null
      : form.handleSubmit(async (data) => {
          let newDataId = dataSourceId;
          if (step === 1) {
            // @ts-expect-error TS(2322) If you come across this, please fix it!: Type 'string | undefined' is not assignable to typ... Remove this comment to see the full error message
            newDataId = await saveDataConnection();
          }
          if (updateSettingsRequired) {
            await updateSettings();
          }
          if (isFinalStep) {
            if (trackedEvents.length > 0) {
              track("Generating Auto Metrics For User", {
                autoMetricsCreated: {
                  countMetrics: data.metricsToCreate.filter(
                    (m) => m.type === "count"
                  ).length,
                  binomialMetrics: data.metricsToCreate.filter(
                    (m) => m.type === "binomial"
                  ).length,
                },
                source,
                type: datasource.type,
                dataSourceId,
                schema: schema,
              });
            }
            // @ts-expect-error TS(2345) If you come across this, please fix it!: Argument of type 'string | null' is not assignable... Remove this comment to see the full error message
            await onSuccess(newDataId);
            onCancel && onCancel();
          } else {
            setStep(step + 1);
          }
        });

  let stepContents: ReactElement;
  if (step === 0) {
    stepContents = (
      <div>
        <h4>Popular Event Sources</h4>
        <p>
          GrowthBook does not store a copy of your data, and instead queries
          your existing analytics infrastructure. GrowthBook has built-in
          support for a number of popular event sources.
        </p>
        <EventSourceList
          onSelect={(s) => {
            setSchemaSettings(s);
            // jump to next step
            setStep(1);
          }}
        />
        <div className="my-2">
          <strong style={{ fontSize: "1.2em" }}>Don&apos;t see yours?</strong>
        </div>
        <div className={`row`}>
          <div className="col-4">
            <a
              className={`btn btn-light-hover btn-outline-${
                "custom" === schema ? "selected" : "primary"
              } mb-3 py-3`}
              onClick={(e) => {
                e.preventDefault();
                setSchema("custom");
                setDatasource({
                  name: "My Datasource",
                  settings: {},
                  projects: project ? [project] : [],
                });
                // no options for custom:
                form.setValue(`settings.schemaOptions`, {});

                // set to all possible types:
                setPossibleTypes(dataSourceConnections.map((o) => o.type));
                // jump to next step
                setStep(1);
              }}
            >
              <h4>Use Custom Source</h4>
              <p className="mb-0 text-dark">
                Manually configure your data schema and analytics queries.
              </p>
            </a>
          </div>
          {showImportSampleData && (
            <div className="col-4">
              <Link href="/demo-datasource-project">
                <a
                  className={`btn btn-light-hover btn-outline-${
                    "custom" === schema ? "selected" : "primary"
                  } mb-3 py-3 ml-auto`}
                >
                  <h4>Use Sample Dataset</h4>
                  <p className="mb-0 text-dark">
                    Explore GrowthBook with a pre-loaded sample dataset.
                  </p>
                </a>
              </Link>
            </div>
          )}
        </div>
        {secondaryCTA && (
          <div className="col-12 text-center">{secondaryCTA}</div>
        )}
      </div>
    );
  } else if (step === 1) {
    stepContents = (
      <div>
        <div className="mb-2">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setLastError("");
              setStep(0);
            }}
          >
            <span style={{ position: "relative", top: "-1px" }}>
              <GBCircleArrowLeft />
            </span>{" "}
            Back
          </a>
        </div>
        <h3>{selectedSchema.label}</h3>
        {selectedSchema && selectedSchema.intro && (
          <div className="mb-4">{selectedSchema.intro}</div>
        )}
        <SelectField
          label="Data Source Type"
          // @ts-expect-error TS(2322) If you come across this, please fix it!: Type 'string | undefined' is not assignable to typ... Remove this comment to see the full error message
          value={datasource.type}
          onChange={(value) => {
            const option = dataSourceConnections.filter(
              (o) => o.type === value
            )[0];
            if (!option) return;

            setLastError("");

            track("Data Source Type Selected", {
              type: value,
              newDatasourceForm: true,
            });

            setDatasource({
              ...datasource,
              type: option.type,
              params: option.default,
            } as Partial<DataSourceInterfaceWithParams>);
          }}
          disabled={existing || possibleTypes.length === 1}
          required
          autoFocus={true}
          placeholder="Choose Type..."
          options={dataSourceConnections
            .filter((o) => {
              return !!possibleTypes.includes(o.type);
            })
            .map((o) => {
              return {
                value: o.type,
                label: o.display,
              };
            })}
        />
        <div className="form-group">
          <label>Display Name</label>
          <input
            type="text"
            className="form-control"
            name="name"
            required
            onChange={onChange}
            value={datasource.name}
          />
        </div>
        <div className="form-group">
          <label>Description</label>
          <textarea
            className="form-control"
            name="description"
            onChange={onChange}
            value={datasource.description}
          />
        </div>
        {projects?.length > 0 && (
          <div className="form-group">
            <MultiSelectField
              label="Projects"
              placeholder="All projects"
              value={datasource.projects || []}
              options={projects.map((p) => ({ value: p.id, label: p.name }))}
              onChange={(v) => onManualChange("projects", v)}
              customClassName="label-overflow-ellipsis"
              helpText="Assign this data source to specific projects"
            />
          </div>
        )}
        {/* @ts-expect-error TS(2786) If you come across this, please fix it!: 'ConnectionSettings' cannot be used as a JSX compo... Remove this comment to see the full error message */}
        <ConnectionSettings
          datasource={datasource}
          existing={existing}
          hasError={!!lastError}
          setDatasource={setDatasource}
        />
      </div>
    );
  } else {
    stepContents = (
      <div>
        <div className="mb-2">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setStep(1);
            }}
          >
            <span style={{ position: "relative", top: "-1px" }}>
              <GBCircleArrowLeft />
            </span>{" "}
            Back
          </a>
        </div>
        <div className="alert alert-success mb-3">
          <strong>Connection successful!</strong>
        </div>
        <h3>{schemasMap.get(schema)?.label || ""} Query Options</h3>
        <div className="my-4">
          <div className="d-inline-block">
            Below are are the typical defaults for{" "}
            {schemasMap.get(schema)?.label || "this data source"}.{" "}
            {selectedSchema?.options?.length === 1
              ? "The value "
              : "These values "}
            are used to generate the queries, which you can adjust as needed at
            any time.
          </div>
        </div>
        <div>
          {selectedSchema?.options?.map(({ name, label, type, helpText }) => (
            <div key={name} className="form-group">
              <Field
                label={label}
                name={name}
                value={form.watch(`settings.schemaOptions.${name}`)}
                type={type}
                onChange={(e) => {
                  form.setValue(
                    `settings.schemaOptions.${name}`,
                    e.target.value
                  );
                }}
                helpText={helpText}
              />
            </div>
          ))}
          {datasourceSupportsAutoGeneratedMetrics && !hasFileConfig() && (
            <div className="form-group">
              <h3 className="py-2">
                Generate Metrics Automatically
                <span className="badge badge-purple text-uppercase ml-2 mb-0">
                  New!
                </span>
              </h3>
              {trackedEvents.length === 0 ? (
                <div className="alert alert-info d-flex justify-content-between align-items-center">
                  <div className="pr-4">
                    {`With ${
                      schemasMap.get(schema).label
                    }, we may be able to automatically generate metrics from your tracked events, `}
                    <strong>
                      saving you and your team valuable time. (It&apos;s Free)
                    </strong>
                  </div>
                  <div>
                    <Button
                      onClick={async () => {
                        setAutoMetricError("");
                        try {
                          track("Generate Auto Metrics CTA Clicked", {
                            source,
                            type: datasource.type,
                            dataSourceId,
                            schema: schema,
                            newDatasourceForm: true,
                          });
                          const res = await apiCall<{
                            trackedEvents: TrackedEventData[];
                            message?: string;
                          }>(`/metrics/tracked-events/${dataSourceId}`);
                          if (res.message) {
                            track("Generate Auto Metrics Error", {
                              error: res.message,
                              source,
                              type: datasource.type,
                              dataSourceId,
                              schema: schema,
                              newDatasourceForm: true,
                            });
                            setAutoMetricError(res.message);
                            return;
                          }
                          // Before we setMetricsToCreate, we need to add a "shouldCreate" boolean property to each metric
                          res.trackedEvents.forEach(
                            (event: TrackedEventData) => {
                              event.metricsToCreate.forEach((metric) => {
                                metric.shouldCreate = true;
                              });
                            }
                          );
                          setTrackedEvents(res.trackedEvents);
                        } catch (e) {
                          track("Generate Auto Metrics Error", {
                            error: e.message,
                            source,
                            type: datasource.type,
                            dataSourceId,
                            schema: schema,
                            newDatasourceForm: true,
                          });
                          setAutoMetricError(e.message);
                        }
                      }}
                      color="warning"
                      className="font-weight-bold"
                    >
                      See What Metrics We Can Create
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <p>
                    {`These are the tracked events we found from ${
                      schemasMap.get(schema)?.label || ""
                    } in your connected warehouse. We can use these events to automatically
                    generate the following metrics for you. And don't worry, you can always edit and remove these
                    metrics at anytime after they're created. `}
                    <DocLink docSection={"metrics"}>
                      Click here to learn more about GrowthBook Metrics.
                    </DocLink>
                  </p>
                  {trackedEvents.length > 0 && (
                    <>
                      <div className="d-flex justify-content-end">
                        <Button
                          color="link"
                          onClick={async () => {
                            const updates: TrackedEventData[] = cloneDeep(
                              trackedEvents
                            );
                            updates.forEach((event) => {
                              event.metricsToCreate.forEach((metric) => {
                                metric.shouldCreate = true;
                              });
                            });
                            setTrackedEvents(updates);
                          }}
                        >
                          Check All
                        </Button>
                        <Button
                          color="link"
                          onClick={async () => {
                            const updates: TrackedEventData[] = cloneDeep(
                              trackedEvents
                            );
                            updates.forEach((event) => {
                              event.metricsToCreate.forEach((metric) => {
                                metric.shouldCreate = false;
                              });
                            });
                            setTrackedEvents(updates);
                          }}
                        >
                          Uncheck All
                        </Button>
                      </div>
                      <table className="appbox table experiment-table gbtable">
                        <thead>
                          <tr>
                            <th>Event Name</th>
                            <th className="text-center">Count</th>
                            <th className="text-center">
                              <Tooltip body="Binomial metrics are simple yes/no conversions (E.G. Created Account)">
                                Create Binomial Metric
                              </Tooltip>
                            </th>
                            <th className="text-center">
                              {" "}
                              <Tooltip body="Count metrics sum conversion values per user (E.G. Pages per Visit)">
                                Create Count Metric
                              </Tooltip>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {trackedEvents.map((event, i) => {
                            return (
                              <AutoMetricCard
                                key={`${event}-${i}`}
                                event={event}
                                trackedEvents={trackedEvents}
                                setTrackedEvents={setTrackedEvents}
                                form={form}
                                i={i}
                                dataSourceId={dataSourceId || ""}
                              />
                            );
                          })}
                        </tbody>
                      </table>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
          {autoMetricError && (
            <div className="alert alert-danger">{autoMetricError}</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <Modal
      open={true}
      header={existing ? "Edit Data Source" : "Add Data Source"}
      close={onCancel}
      // @ts-expect-error TS(2322) If you come across this, please fix it!: Type 'null' is not assignable to type 'string | un... Remove this comment to see the full error message
      disabledMessage={disabledMessage}
      ctaEnabled={ctaEnabled}
      // @ts-expect-error TS(2322) If you come across this, please fix it!: Type '(() => Promise<void>) | null' is not assigna... Remove this comment to see the full error message
      submit={submit}
      autoCloseOnSubmit={false}
      cta={isFinalStep ? (step === 2 ? "Finish" : "Save") : "Next"}
      closeCta="Cancel"
      size="lg"
      error={lastError}
      inline={inline}
    >
      {stepContents}
    </Modal>
  );
};

export default NewDataSourceForm;
