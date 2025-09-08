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
    }

    stages {
        stage('Checkout') {
            steps {
                container('jnlp') {
                    checkout scm
                }
            }
        }

        stage('Get Repo Name') {
            steps {
                container('jnlp') {
                    script {
                        def repoUrl      = scm.getUserRemoteConfigs()[0].getUrl()
                        def repoName     = repoUrl.tokenize('/').last().replace('.git','').toLowerCase()
                        def deploymentRepo = repoUrl.replace('.git','') + "-deployment.git"
                        def commitSha    = sh(script: 'git rev-parse --short HEAD', returnStdout: true).trim()

                        env.REPO_NAME      = repoName
                        env.IMAGE_NAME     = "docker.io/chankyswami/${repoName}:${commitSha}"
                        env.DEPLOYMENT_REPO = deploymentRepo

                        echo "📦 Repository Name: ${repoName}"
                        echo "🐳 Docker Image Name: ${env.IMAGE_NAME}"
                        echo "📂 Deployment Repository: ${env.DEPLOYMENT_REPO}"
                    }
                }
            }
        }

        stage('Build Frontend (npm)') {
            steps {
                container('jnlp') {
                    dir('gfj-ui') {
                        sh '''
                            set -eux
                            echo "🌐 Installing npm dependencies"
                            npm install   # ✅ identical to EC2 pipeline

                            echo "⚒️ Building production bundle"
                            npm run build
                        '''
                    }
                }
            }
        }

        stage('Build & Push Image with Buildah') {
            steps {
                container('buildah') {
                    withCredentials([usernamePassword(credentialsId: "${DOCKER_CREDS_ID}", usernameVariable: 'DOCKER_USERNAME', passwordVariable: 'DOCKER_PASSWORD')]) {
                        sh '''
                            set -eux
                            echo "🔑 Logging in to Docker Hub..."
                            buildah login -u "${DOCKER_USERNAME}" -p "${DOCKER_PASSWORD}" docker.io

                            echo "📦 Building image with Buildah..."
                            buildah bud -t ${IMAGE_NAME} -f gfj-ui/Dockerfile gfj-ui

                            echo "📤 Pushing image to Docker Hub..."
                            buildah push ${IMAGE_NAME}
                        '''
                    }
                }
            }
        }

        stage('Update K8s Manifests & Push') {
            steps {
                container('jnlp') {
                    withCredentials([string(credentialsId: "${GIT_CREDENTIALS_ID}", variable: 'GIT_TOKEN')]) {
                        sh '''
                            set -eux
                            DEPLOYMENT_REPO_AUTH=$(echo ${DEPLOYMENT_REPO} | sed "s|https://|https://${GIT_TOKEN}@|")

                            echo "📥 Cloning deployment repo..."
                            git clone -b main ${DEPLOYMENT_REPO_AUTH} k8s-manifests
                            cd k8s-manifests

                            echo "📝 Updating image reference in deployment.yaml..."
                            if grep -q "image: " deployment.yaml; then
                              sed -i 's|image: .*|image: '"${IMAGE_NAME}"'|' deployment.yaml
                            else
                              echo "⚠️ No image: line found in deployment.yaml — ensure correct manifest path"
                            fi

                            git config --global user.email "c.innovator@gmail.com"
                            git config --global user.name "chankyswami"

                            git add .
                            git commit -m "chore: update frontend image to ${IMAGE_NAME}" || echo "ℹ️ No changes to commit"
                            git push origin main || echo "⚠️ Push failed"
                        '''
                    }
                }
            }
        }
    }

    post {
        failure {
            echo "❌ Pipeline failed"
        }
        success {
            echo "✅ Frontend image built and deployment repo updated"
        }
    }
}
