pipeline {
    agent {
        kubernetes {
            label 'jnlp-buildah'
            yamlFile 'gfj-ui/jnlp-buildah.yaml'
        }
    }

    environment {
        GIT_CREDENTIALS_ID = 'jenkins-token-github'
        DOCKER_CREDS_ID    = 'dockerhub-username-password'
        SONAR_URL          = 'http://sonarqube.devops-tools.svc.cluster.local:9000'
        SONAR_TOKEN        = credentials('sonar-token')
    }

    stages {

        /* ===================== CHECKOUT ===================== */
        stage('Checkout') {
            steps {
                container('jnlp') {
                    checkout scm
                }
            }
        }

        /* ===================== METADATA ===================== */
        stage('Get Repo Name') {
            steps {
                container('jnlp') {
                    script {
                        def repoUrl        = scm.getUserRemoteConfigs()[0].getUrl()
                        def repoName       = repoUrl.tokenize('/').last().replace('.git','').toLowerCase()
                        def deploymentRepo = repoUrl.replace('.git','') + "-deployment.git"
                        def commitSha      = sh(script: 'git rev-parse --short HEAD', returnStdout: true).trim()

                        env.REPO_NAME       = repoName
                        env.IMAGE_NAME      = "docker.io/chankyswami/${repoName}:${commitSha}"
                        env.DEPLOYMENT_REPO = deploymentRepo

                        echo "📦 Repo Name        : ${repoName}"
                        echo "🐳 Image Name       : ${env.IMAGE_NAME}"
                        echo "📂 Deployment Repo  : ${env.DEPLOYMENT_REPO}"
                    }
                }
            }
        }

        /* ===================== BUILD FRONTEND ===================== */
        stage('Build Frontend (npm)') {
            steps {
                container('jnlp') {
                    dir('gfj-ui') {
                        sh '''
                            set -eux
                            npm install
                            npm run build
                        '''
                    }
                }
            }
        }

        /* ===================== OWASP DEPENDENCY CHECK ===================== */
        stage('OWASP Dependency Check') {
            steps {
                container('jnlp') {
                    dir('gfj-ui') {
                        sh '''
                            set -eux
                            mkdir -p dependency-check-report

                            dependency-check.sh \
                              --scan . \
                              --format "ALL" \
                              --out dependency-check-report \
                              --disableAssembly \
                              --failOnCVSS 7
                        '''
                    }
                }
            }
            post {
                always {
                    dependencyCheckPublisher pattern: '**/dependency-check-report/dependency-check-report.xml'
                }
            }
        }

        /* ===================== SONARQUBE ===================== */
        stage('SonarQube Analysis') {
            steps {
                container('jnlp') {
                    dir('gfj-ui') {
                        withSonarQubeEnv('sonar') {
                            sh '''
                                set -eux
                                npx sonar-scanner \
                                  -Dsonar.projectKey=${REPO_NAME} \
                                  -Dsonar.sources=src \
                                  -Dsonar.host.url=${SONAR_URL} \
                                  -Dsonar.login=${SONAR_TOKEN} \
                                  -Dsonar.exclusions=**/node_modules/**,**/dist/**
                            '''
                        }
                    }
                }
            }
        }

        /* ===================== QUALITY GATE ===================== */
        stage('Quality Gate') {
            steps {
                container('jnlp') {
                    timeout(time: 5, unit: 'MINUTES') {
                        waitForQualityGate abortPipeline: true
                    }
                }
            }
        }

        /* ===================== BUILD IMAGE ===================== */
        stage('Build Image with Buildah') {
            steps {
                container('buildah') {
                    sh '''
                        set -eux
                        buildah bud -t ${IMAGE_NAME} -f gfj-ui/Dockerfile gfj-ui
                    '''
                }
            }
        }

        /* ===================== TRIVY IMAGE SCAN ===================== */
        stage('Trivy Image Scan') {
            steps {
                container('buildah') {
                    sh '''
                        set -eux
                        trivy image \
                          --severity HIGH,CRITICAL \
                          --exit-code 1 \
                          --no-progress \
                          ${IMAGE_NAME}
                    '''
                }
            }
        }

        /* ===================== PUSH IMAGE ===================== */
        stage('Push Image to Docker Hub') {
            steps {
                container('buildah') {
                    withCredentials([
                        usernamePassword(
                            credentialsId: "${DOCKER_CREDS_ID}",
                            usernameVariable: 'DOCKER_USERNAME',
                            passwordVariable: 'DOCKER_PASSWORD'
                        )
                    ]) {
                        sh '''
                            set -eux
                            buildah login -u "${DOCKER_USERNAME}" -p "${DOCKER_PASSWORD}" docker.io
                            buildah push ${IMAGE_NAME}
                        '''
                    }
                }
            }
        }

        /* ===================== GITOPS UPDATE ===================== */
        stage('Update K8s Manifests & Push') {
            steps {
                container('jnlp') {
                    withCredentials([
                        string(credentialsId: "${GIT_CREDENTIALS_ID}", variable: 'GIT_TOKEN')
                    ]) {
                        sh '''
                            set -eux
                            DEPLOYMENT_REPO_AUTH=$(echo ${DEPLOYMENT_REPO} | sed "s|https://|https://${GIT_TOKEN}@|")

                            git clone -b main ${DEPLOYMENT_REPO_AUTH} k8s-manifests
                            cd k8s-manifests

                            sed -i 's|image: .*|image: '"${IMAGE_NAME}"'|' deployment.yaml

                            git config user.email "c.innovator@gmail.com"
                            git config user.name  "chankyswami"

                            git add .
                            git commit -m "chore: update frontend image to ${IMAGE_NAME}" || echo "No changes"
                            git push origin main
                        '''
                    }
                }
            }
        }
    }

    post {
        success {
            echo "✅ Build, Scan, and GitOps update completed successfully"
        }
        failure {
            echo "❌ Pipeline failed — check security or quality gates"
        }
    }
}
