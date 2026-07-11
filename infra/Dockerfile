FROM public.ecr.aws/lambda/python:3.12

COPY pyproject.toml README.md ./
COPY travelplanner/ travelplanner/
COPY server/ server/

RUN pip install --no-cache-dir .

# Default: API handler. SAM ImageConfig.Command overrides for workers.
CMD ["server.lambda_handler.handler"]
