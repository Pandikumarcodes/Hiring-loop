export function createFoundationController({ useCase }) {
  return async function foundationController(request, response) {
    const command = { name: request.validated.body.name };
    const result = await useCase.execute(command);

    response.status(201).json({
      id: result.id,
      name: result.name,
    });
  };
}
