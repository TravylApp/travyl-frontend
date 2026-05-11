// ─── OpenTripPlanner Self-Hosted Infrastructure ────────────
//
// Creates a VPC, ECS cluster, EFS volume, and Fargate service for
// running OTP2. Also defines a graph builder task + monthly rebuild cron.
//
// IMPORTANT: After first deploy, set the OtpServerUrl secret to the
// load balancer URL printed in the stack output, then redeploy:
//
//   sst secret set OtpServerUrl <alb-url> --stage production
//   sst deploy --stage production
//
// This is needed because transit-search.ts reads Resource.OtpServerUrl.value.
// For the same reason, set OtpApiKey if API key auth is desired.

// ─── VPC ────────────────────────────────────────────────────
// 2 AZs with managed NAT Gateways for outbound internet from ECS
// (needed for pulling Docker images and for OTP builder downloads).
const vpc = new sst.aws.Vpc('OtpVpc', {
  nat: 'managed',
  az: 2,
})

// ─── ECS Cluster ────────────────────────────────────────────
const cluster = new sst.aws.Cluster('OtpCluster', { vpc })

// ─── EFS (persistent graph storage) ─────────────────────────
// Stores the built OTP graph. Bursting throughput is sufficient for
// monthly graph rebuilds. Mounted at /var/otp/graphs in both the
// runtime OTP service and the graph builder task.
const efs = new sst.aws.Efs('OtpEfs', { vpc })

// ─── OTP Runtime Service ────────────────────────────────────
// Runs opentripplanner/opentripplanner:2.6.0 on Fargate with
// an internal load balancer (publicly accessible since the Lambda
// querying it lives outside this VPC; use OtpApiKey for auth).
//
// Graph is loaded from EFS at startup. The service is auto-started
// only in deployed mode (autostart: false for sst dev).
const otpService = new sst.aws.Service('OtpService', {
  cluster,
  image: 'opentripplanner/opentripplanner:2.6.0',
  cpu: '4 vCPU',
  memory: '16 GB',
  storage: '40 GB',
  architecture: 'x86_64',
  command: ['--load', '--serve', '--port', '8080', '/var/otp/graphs'],
  loadBalancer: {
    ports: [{ listen: '80/http', forward: '8080/http' }],
  },
  scaling: {
    min: 1,
    max: 1,
  },
  volumes: [
    {
      efs,
      path: '/var/otp/graphs',
    },
  ],
  environment: {
    JAVA_OPTS: '-Xmx14G -Xms14G',
  },
  dev: {
    autostart: false,
  },
})

// ─── Graph Builder ──────────────────────────────────────────
// The custom Docker image at scripts/otp-builder/ requires a Docker
// daemon to build. It is excluded from the default deploy; uncomment
// when Docker Desktop is available. Without it, the initial graph
// must be built on an EC2 instance or via Docker locally and uploaded
// to the EFS volume manually.
//
// import { graphBuilder } from './graph-builder'
// export { graphBuilder }

// Export for use by api.ts (linking) and sst.config.ts (stack outputs)
export { otpService, vpc, efs, cluster }
